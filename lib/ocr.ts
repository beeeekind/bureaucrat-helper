import Tesseract from 'tesseract.js'
import fs from 'fs'

const TESSDATA_DIR = '/tmp/tessdata'

async function recognize(imageBuffer: Buffer): Promise<string> {
  if (!fs.existsSync(TESSDATA_DIR)) {
    fs.mkdirSync(TESSDATA_DIR, { recursive: true })
  }
  const worker = await Tesseract.createWorker('ukr+rus', 1, {
    cachePath: TESSDATA_DIR,
    logger: () => {},
  })
  try {
    const { data: { text } } = await worker.recognize(imageBuffer)
    return text.trim()
  } finally {
    await worker.terminate()
  }
}

/** OCR a raw image buffer (JPEG / PNG). */
export async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  return recognize(buffer)
}

/**
 * OCR a scanned PDF: renders each page to PNG via pdfjs-dist + @napi-rs/canvas,
 * then runs Tesseract on each page image.
 * Only the first 5 pages are processed to stay within the 60 s timeout.
 */
export async function ocrPdfBuffer(pdfBuffer: Buffer): Promise<string> {
  // Dynamic imports keep the server bundle smaller and avoid top-level ESM issues.
  // pdfjs-dist v5 legacy build is required for Node.js (the main build needs DOMMatrix).
  // It auto-sets GlobalWorkerOptions.workerSrc to ./pdf.worker.mjs relative to itself.
  const [pdfjs, { createCanvas }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('@napi-rs/canvas'),
  ])

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableStream: true,
    disableFontFace: true,
    disableAutoFetch: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any).promise

  const pageCount = Math.min(doc.numPages, 5)
  const pages: string[] = []

  for (let n = 1; n <= pageCount; n++) {
    const page = await doc.getPage(n)
    const vp   = page.getViewport({ scale: 2.0 })
    const cvs = createCanvas(Math.round(vp.width), Math.round(vp.height))

    // pdfjs-dist v5: `canvas` is the primary field; @napi-rs/canvas is used
    // internally by NodeCanvasFactory so the API surface is compatible.
    await page.render({
      canvas: cvs as unknown as HTMLCanvasElement,
      viewport: vp,
    }).promise

    const png  = cvs.toBuffer('image/png')
    const text = await recognize(png)
    if (text.length > 5) pages.push(text)
    page.cleanup()
  }

  return pages.join('\n\n')
}
