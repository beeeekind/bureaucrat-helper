import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { CHAT_SYSTEM_PROMPT } from '@/lib/prompts'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'missing_api_key' }, { status: 500 })
  }

  const { messages, documentContext } = await request.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    documentContext?: string
  }

  const systemPrompt = documentContext
    ? `${CHAT_SYSTEM_PROMPT}\n\n---\nДОКУМЕНТ КОРИСТУВАЧА:\n${documentContext}`
    : CHAT_SYSTEM_PROMPT

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`[Помилка: ${msg}]`))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
