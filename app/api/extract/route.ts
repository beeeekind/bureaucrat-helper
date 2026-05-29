import { extractText } from '@/lib/pdf'
import { ocrImageBuffer, ocrPdfBuffer } from '@/lib/ocr'

export const runtime    = 'nodejs'
export const maxDuration = 60

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return Response.json({ error: 'no_file' }, { status: 400 })

  const mime    = file.type
  const isImage = IMAGE_TYPES.has(mime)
  const isPdf   = mime === 'application/pdf' || (!isImage && file.name.toLowerCase().endsWith('.pdf'))

  if (!isImage && !isPdf) {
    return Response.json({ error: 'unsupported_type' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── Image: OCR directly ──────────────────────────────────────
  if (isImage) {
    try {
      const text = await ocrImageBuffer(buffer)
      if (text.length < 20) return Response.json({ error: 'ocr_empty' }, { status: 422 })
      return Response.json({ text: text.slice(0, 80_000), ocr: true })
    } catch {
      return Response.json({ error: 'ocr_failed' }, { status: 422 })
    }
  }

  // ── PDF: try text layer first ────────────────────────────────
  try {
    const text = await extractText(buffer)
    return Response.json({ text: text.slice(0, 80_000) })
  } catch (err) {
    const isNoText = err instanceof Error && err.message === 'NO_TEXT_LAYER'
    if (!isNoText) return Response.json({ error: 'parse_error' }, { status: 400 })

    // ── No text layer: render pages → OCR ─────────────────────
    try {
      const text = await ocrPdfBuffer(buffer)
      if (text.length < 20) return Response.json({ error: 'ocr_empty' }, { status: 422 })
      return Response.json({ text: text.slice(0, 80_000), ocr: true })
    } catch {
      return Response.json({ error: 'ocr_failed' }, { status: 422 })
    }
  }
}
