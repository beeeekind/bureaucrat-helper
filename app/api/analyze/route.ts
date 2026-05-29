import { streamObject } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { ANALYZE_SYSTEM_PROMPT_UK, ANALYZE_SYSTEM_PROMPT_EN } from '@/lib/prompts'

export const runtime = 'nodejs'

// Inject output_config.effort at the fetch level — @ai-sdk/anthropic v1.x
// doesn't expose the effort param in its schema, but the provider exposes a
// custom fetch hook so we can add it to the raw request body.
// Note: "claude-opus-4.8" does not exist; the latest Opus is claude-opus-4-6.
const anthropic = createAnthropic({
  fetch: async (url, init) => {
    const body = JSON.parse((init?.body as string) ?? '{}')
    body.output_config = { effort: 'medium' }
    return fetch(url, { ...init, body: JSON.stringify(body) })
  },
})

export const analysisSchema = z.object({
  document_type: z.string(),
  summary: z.string(),
  deadlines: z.array(z.object({
    what: z.string(),
    when: z.string(),
    consequence: z.string().optional(),
  })),
  required_actions: z.array(z.string()),
  risks: z.array(z.string()),
  next_steps: z.array(z.string()),
  uncertain_points: z.array(z.string()),
  official_sources_to_check: z.array(z.string()),
})

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'missing_api_key' }, { status: 500 })
  }

  const { documentText, lang } = await request.json() as {
    documentText: string
    lang?: 'uk' | 'en'
  }

  const system = lang === 'en' ? ANALYZE_SYSTEM_PROMPT_EN : ANALYZE_SYSTEM_PROMPT_UK
  const docLabel = lang === 'en' ? 'DOCUMENT' : 'ДОКУМЕНТ'

  const result = streamObject({
    model: anthropic('claude-opus-4-6'),
    schema: analysisSchema,
    system,
    messages: [{ role: 'user', content: `${docLabel}:\n${documentText}` }],
  })

  return result.toTextStreamResponse()
}
