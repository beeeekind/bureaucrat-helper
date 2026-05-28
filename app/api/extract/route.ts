import { extractText } from '@/lib/pdf'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'no_file' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const text = await extractText(buffer)
    return Response.json({ text: text.slice(0, 80_000) })
  } catch (err) {
    const isNoText = err instanceof Error && err.message === 'NO_TEXT_LAYER'
    if (isNoText) return Response.json({ error: 'no_text' }, { status: 422 })
    return Response.json({ error: 'parse_error' }, { status: 400 })
  }
}
