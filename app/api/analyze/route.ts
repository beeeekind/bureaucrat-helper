import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { extractText } from '@/lib/pdf'
import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from '@/lib/prompts'

// Force Node.js runtime - required for pdf-parse and Buffer
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'no_file' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let text: string
  try {
    text = await extractText(buffer)
  } catch (err) {
    const isNoText = err instanceof Error && err.message === 'NO_TEXT_LAYER'
    if (isNoText) {
      return Response.json({ error: 'no_text' }, { status: 422 })
    }
    return Response.json({ error: 'parse_error' }, { status: 400 })
  }

  // Truncate to avoid exceeding context limits
  const documentText = text.slice(0, 100_000)

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'missing_api_key' }, { status: 500 })
  }

  let result: ReturnType<typeof streamText>
  try {
    result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: ANALYSIS_PROMPT.replace('{{DOCUMENT_TEXT}}', documentText),
        },
      ],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `stream_init_error: ${message}` }, { status: 500 })
  }

  // Pipe the AI SDK text stream as a plain ReadableStream.
  // The client accumulates chunks and parses the complete JSON when done.
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`__STREAM_ERROR__:${message}`))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
