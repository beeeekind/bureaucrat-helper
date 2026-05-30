'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { experimental_useObject } from 'ai/react'
import { z } from 'zod'
import { sanitize } from '@/lib/sanitize'
import { useApp } from '@/app/providers'

// ─── Schema ─────────────────────────────────────────────────────

const analysisSchema = z.object({
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

type Lang  = 'uk' | 'en'
type Phase = 'welcome' | 'analyzing' | 'exiting' | 'done'

// ─── Stage labels ────────────────────────────────────────────────

const STAGES = {
  uk: ['Читаю документ', 'Витягую ключову інформацію', 'Визначаю дедлайни', 'Шукаю ризики', 'Формую наступні кроки'],
  en: ['Reading the document', 'Extracting key information', 'Identifying deadlines', 'Assessing risks', 'Building next steps'],
}

const OCR_STAGE = {
  uk: 'Розпізнаю текст зі скану',
  en: 'Reading text from image',
}

const MIN_STAGE_MS = 650

// Cascade delays — fixed semantic slots, independent of data timing
const REVEAL = {
  summary: '0ms',
  pair:    '380ms',
  risks:   '730ms',
  steps:   '1060ms',
  check:   '1380ms',
}

// ─── Translations ────────────────────────────────────────────────

const T = {
  uk: {
    tagline:       'Ваш бюрократ помічник',
    uploadHint:    'Що цей документ від вас хоче?',
    uploadAction:  'Натисніть або перетягніть PDF або фото',
    uploadDrag:    'Відпустіть, розберемося',
    uploadSize:    'PDF, JPG, PNG, до 10 МБ',
    uploadLabel:   'Завантажити документ',
    newDoc:        'Новий документ',
    langToggle:    'EN',
    labelWhat:     'Про документ',
    labelDeadlines:'Дедлайни',
    labelActions:  'Що треба зробити',
    labelRisks:    'Ризики якщо ігнорувати',
    labelSteps:    'Наступні кроки',
    labelCheck:    'Що варто перевірити',
    labelSources:  'Офіційні джерела',
    cameraLabel:   'Сфотографувати',
    galleryLabel:  'Обрати з бібліотеки',
    errCancelled:  null,
    errPdfOnly:    'Підтримуються PDF, JPG та PNG.',
    errTooLarge:   'Максимум 10 МБ.',
    errNoText:     'Цей PDF не містить тексту. Можливо, це скан без текстового шару.',
    errReadFail:   'Не вдалося прочитати файл.',
    errOcr:        'Не вдалося розпізнати текст. Спробуйте чіткіший скан.',
    errUpload:     'Помилка завантаження.',
    errServer:     'Помилка сервера.',
    errNoKey:      'Сервер не налаштований.',
    errNetwork:    'Помилка зв\'язку.',
  },
  en: {
    tagline:       'Your bureaucracy assistant',
    uploadHint:    'What does this document want from you?',
    uploadAction:  'Drop a PDF or photo, or click to browse',
    uploadDrag:    "Drop it, we'll figure it out",
    uploadSize:    'PDF, JPG, PNG, up to 10 MB',
    uploadLabel:   'Upload a document',
    newDoc:        'New document',
    langToggle:    'УКР',
    labelWhat:     'What is this',
    labelDeadlines:'Deadlines',
    labelActions:  'What to do',
    labelRisks:    'Risks if ignored',
    labelSteps:    'Next steps',
    labelCheck:    'Unclear points',
    labelSources:  'Official sources',
    cameraLabel:   'Take photo',
    galleryLabel:  'Choose from library',
    errCancelled:  null,
    errPdfOnly:    'Only PDF, JPG, and PNG files are supported.',
    errTooLarge:   'File is too large. Maximum 10 MB.',
    errNoText:     'This PDF has no text layer. It may be a scanned document.',
    errReadFail:   'Could not read the file.',
    errOcr:        'Could not read the text. Try a clearer image.',
    errUpload:     'Upload failed. Please try again.',
    errServer:     'Something went wrong on our end.',
    errNoKey:      'Server is not configured.',
    errNetwork:    'Connection error. Check your internet.',
  },
}

// ─── Icons ──────────────────────────────────────────────────────

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Blob particles ──────────────────────────────────────────────
// Two soft blobs that drift, merge, and separate like a lava lamp.
// Each blob is a cloud of particles with gaussian opacity falloff
// and multi-harmonic shape morphing. A compositor-level blur(1.5px)
// on the canvas fuses the dots into liquid mass — essentially free.

function BlobParticles({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = canvas.width  = canvas.offsetWidth  || 400
    let H = canvas.height = canvas.offsetHeight || 600
    let blobR = Math.min(W, H) * 0.28   // slightly larger presence
    let animId: number

    const PHI = 1.6180339887498948

    // Box-Muller normal distribution for soft radius clustering
    function randNorm(): number {
      let u = 0, v = 0
      while (u === 0) u = Math.random()
      while (v === 0) v = Math.random()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    }

    interface P {
      blob:    0 | 1
      angle:   number
      rad:     number    // fraction of effective blob radius
      phase:   number
      orbit:   number    // slow angular drift speed
      size:    number    // dot radius in px
      opacity: number    // base opacity before falloff
    }

    // Visibility calibration per theme.
    //
    // Dark:  light amber particles on near-black bg. Standard opacity.
    //        falloffExp 1.2 (was 1.5) — softer edges, more atmospheric body.
    //
    // Light: dark warm particles on parchment bg. Three boosts needed:
    //   1. Richer darker color ('88,66,46' vs old '108,86,64') — more contrast
    //   2. opacityMult 2.2 — compensates for the CSS blur spreading each dot
    //      across ~4× its pixel area, which slashes peak alpha by the same ratio
    //   3. falloffExp 0.9 (sub-linear) — edge particles stay significantly more
    //      visible; this is what creates the "body" of the cloud
    const rgb         = dark ? '196, 168, 130' : '88, 66, 46'
    const opacityMult = dark ? 1.3              : 2.2
    const falloffExp  = dark ? 1.2              : 0.9

    const COUNT = 200
    const particles: P[] = Array.from({ length: COUNT }, (_, i) => {
      const blob: 0 | 1 = i < COUNT / 2 ? 0 : 1
      const layer = i % 3
      const r = Math.min(Math.abs(randNorm() * 0.28 + 0.36), 0.96)
      return {
        blob,
        angle:   Math.random() * Math.PI * 2,
        rad:     r,
        phase:   Math.random() * Math.PI * 2,
        orbit:   (Math.random() - 0.5) * 0.00013,
        // Slightly larger dots so the CSS blur doesn't fully dissolve them
        size:    layer === 2 ? 1.10 + Math.random() * 1.05
               : layer === 1 ? 0.75 + Math.random() * 0.75
               :               0.50 + Math.random() * 0.55,
        opacity: (layer === 2 ? 0.18 + Math.random() * 0.14
               : layer === 1 ? 0.12 + Math.random() * 0.11
               :               0.07 + Math.random() * 0.08) * opacityMult,
      }
    })

    let t = 0

    function draw() {
      ctx!.clearRect(0, 0, W, H)

      // Blob A: wide lateral sweep
      const cxA = W * 0.5
        + Math.sin(t * 0.000278) * W * 0.22
        + Math.sin(t * 0.000278 * PHI * PHI) * W * 0.09
      const cyA = H * 0.5
        + Math.cos(t * 0.000218) * H * 0.15
        + Math.cos(t * 0.000218 * PHI) * H * 0.07

      // Blob B: different phase + slightly tighter path → natural merging
      const cxB = W * 0.5
        + Math.sin(t * 0.000223 + 2.09) * W * 0.20
        + Math.sin(t * 0.000223 * PHI + 0.70) * W * 0.08
      const cyB = H * 0.5
        + Math.cos(t * 0.000191 + 1.41) * H * 0.14
        + Math.cos(t * 0.000191 * PHI * PHI + 0.50) * H * 0.06

      // Independent breathing per blob
      const brA = 1 + 0.15 * Math.sin(t * 0.000715)
                    + 0.06 * Math.sin(t * 0.000715 * PHI)
      const brB = 1 + 0.13 * Math.sin(t * 0.000682 + 1.20)
                    + 0.07 * Math.sin(t * 0.000682 * PHI)

      const rA = blobR * brA
      const rB = blobR * brB * 0.88  // B slightly smaller for variety

      for (const p of particles) {
        const cx  = p.blob === 0 ? cxA : cxB
        const cy  = p.blob === 0 ? cyA : cyB
        const effR = p.blob === 0 ? rA  : rB

        const a = p.angle + p.orbit * t

        // Multi-harmonic shape morphing — three overlapping spatial frequencies
        const shape = 1
          + 0.30 * Math.sin(a * 3 + t * 0.000525         + p.phase)
          + 0.14 * Math.cos(a * 5 + t * 0.000385 * PHI   + p.phase * 0.70)
          + 0.07 * Math.sin(a * 7 + t * 0.000195 * PHI*PHI + p.phase * 1.30)

        const r  = p.rad * effR * Math.max(0.04, shape)
        const px = cx + Math.cos(a) * r
        const py = cy + Math.sin(a) * r

        // Gaussian-ish falloff. falloffExp: 1.2 dark (moderate), 0.9 light
        // (sub-linear — edge particles stay visibly present, creating cloud body)
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
        const norm = dist / (effR * 1.08)
        const falloff = Math.pow(Math.max(0, 1 - norm * norm), falloffExp)

        // Very subtle per-particle shimmer
        const shimmer = 0.80 + 0.20 * Math.sin(t * 0.00172 + p.phase)

        const alpha = p.opacity * falloff * shimmer
        if (alpha < 0.005) continue

        // Soft halo: a larger circle at low alpha drawn first, then the core dot
        // on top. Without hardware shadowBlur, this is the cheapest way to add
        // luminosity depth and make each particle "breathe" into the atmosphere.
        const haloAlpha = alpha * 0.24
        if (haloAlpha > 0.003) {
          ctx!.beginPath()
          ctx!.arc(px, py, p.size * 3.2, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(${rgb}, ${haloAlpha})`
          ctx!.fill()
        }

        ctx!.beginPath()
        ctx!.arc(px, py, p.size, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${rgb}, ${alpha})`
        ctx!.fill()
      }

      t++
      animId = requestAnimationFrame(draw)
    }

    draw()

    function onResize() {
      W = canvas!.width  = canvas!.offsetWidth  || 400
      H = canvas!.height = canvas!.offsetHeight || 600
      blobR = Math.min(W, H) * 0.28
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [dark])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        // Dark: 1.5px fuses dots into a warm amber glow on the dark field.
        // Light: 1px — less spreading so individual halos stay perceptible;
        //        dots are already slightly larger to compensate.
        filter: dark ? 'blur(1.5px)' : 'blur(1px)',
      }}
    />
  )
}

// ─── Particle field ──────────────────────────────────────────────

function ParticleField({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = canvas.width  = canvas.offsetWidth
    let H = canvas.height = canvas.offsetHeight
    let animId: number

    // Same color family as BlobParticles for material unity.
    // Dark: gentle boost over original values.
    // Light: richer color + meaningfully higher opacity so ambient drift is felt.
    const rgb          = dark ? '196, 168, 130' : '88, 66, 46'
    const opacityBase  = dark ? 0.06 : 0.11
    const opacityRange = dark ? 0.11 : 0.16

    const particles = Array.from({ length: 72 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.8 + Math.random() * 1.1,     // slightly larger than before
      seed: i * 137.508 + Math.random() * 200,
      speed: 0.09 + Math.random() * 0.14,
      opacity: opacityBase + Math.random() * opacityRange,
    }))
    let t = 0

    function draw() {
      ctx!.clearRect(0, 0, W, H)
      for (const p of particles) {
        // Overlapping sine fields — organic, non-repeating drift
        const angle =
          Math.sin(t * 0.00042 + p.seed * 0.61) * 0.72 +
          Math.cos(t * 0.00029 + p.seed * 1.31) * 0.44
        const spd = p.speed * (0.72 + Math.sin(t * 0.00026 + p.seed * 0.88) * 0.28)
        p.x += Math.cos(angle) * spd
        p.y += Math.sin(angle) * spd
        if (p.x < -6) p.x = W + 6
        else if (p.x > W + 6) p.x = -6
        if (p.y < -6) p.y = H + 6
        else if (p.y > H + 6) p.y = -6
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${rgb}, ${p.opacity})`
        ctx!.fill()
      }
      t++
      animId = requestAnimationFrame(draw)
    }

    draw()

    function onResize() {
      W = canvas!.width  = canvas!.offsetWidth
      H = canvas!.height = canvas!.offsetHeight
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [dark])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}

// ─── Typing cursor ───────────────────────────────────────────────

function Cursor() {
  return <span className="typing-cursor" aria-hidden />
}

// ─── Stream frontier ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStreamFrontier(obj: any): string | null {
  if (!obj) return null
  const order = ['document_type', 'summary', 'deadlines', 'required_actions', 'risks', 'next_steps', 'uncertain_points', 'official_sources_to_check'] as const
  let last: string | null = null
  for (const f of order) {
    const v = obj[f]
    if (v == null) continue
    if (typeof v === 'string' && v !== '') { last = f; continue }
    if (Array.isArray(v) && v.length > 0)  { last = f; continue }
  }
  return last
}

// ─── Editorial layout ─────────────────────────────────────────────
// Fixed 5-section composition: summary / pair / risks / steps / check

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EditorialLayout({ object, isStreaming, revealed, lang }: {
  object: any
  isStreaming: boolean
  revealed: boolean
  lang: Lang
}) {
  const t = T[lang]
  const frontier = getStreamFrontier(object)

  // Typed arrays from partial object
  type DL = { what?: string; when?: string; consequence?: string }
  const deadlines: DL[]  = (object?.deadlines        ?? []) as DL[]
  const actions:   string[] = (object?.required_actions  ?? []) as string[]
  const risks:     string[] = (object?.risks             ?? []) as string[]
  const steps:     string[] = (object?.next_steps        ?? []) as string[]
  const uncertain: string[] = (object?.uncertain_points  ?? []) as string[]
  const sources:   string[] = (object?.official_sources_to_check ?? []) as string[]

  const hasDoc      = !!(object?.document_type || object?.summary)
  const hasDeadlines = deadlines.length > 0
  const hasActions   = actions.length > 0
  const hasPair      = hasDeadlines || hasActions
  const hasBothPair  = hasDeadlines && hasActions
  const hasRisks     = risks.length > 0
  const hasSteps     = steps.length > 0
  const hasCheck     = uncertain.length > 0 || sources.length > 0

  const revealedCls = revealed ? 'revealed' : ''

  return (
    <div className={`editorial-layout ${revealedCls}`} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── 1. Summary ── full width hero ──────────────────── */}
      {hasDoc && (
        <div className="e-section" style={{ '--reveal-delay': REVEAL.summary } as React.CSSProperties}>
          <div className="e-card">
            {object?.document_type && (
              <span style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: 'var(--accent)',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}>
                {sanitize(object.document_type)}
                {frontier === 'document_type' && isStreaming && <Cursor />}
              </span>
            )}
            {object?.summary && (
              <p style={{ fontSize: '15px', lineHeight: '1.85', color: 'var(--text-2)', margin: 0, fontWeight: 400 }}>
                {sanitize(object.summary)}
                {frontier === 'summary' && isStreaming && <Cursor />}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Deadlines + Actions ── two columns ──────────── */}
      {hasPair && (
        <div className="e-section" style={{ '--reveal-delay': REVEAL.pair } as React.CSSProperties}>
          <div className={hasBothPair ? 'editorial-pair' : undefined}>

            {/* Deadlines */}
            {hasDeadlines && (
              <div className="e-card">
                <span className="e-label">{t.labelDeadlines}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {deadlines.map((d, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {d.when && (
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4 }}>
                          {sanitize(d.when)}
                        </span>
                      )}
                      {d.what && (
                        <span style={{ fontSize: '13px', lineHeight: '1.65', color: 'var(--text-2)' }}>
                          {sanitize(d.what)}
                        </span>
                      )}
                      {d.consequence && (
                        <span style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--danger)', marginTop: '2px' }}>
                          {sanitize(d.consequence)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required actions */}
            {hasActions && (
              <div className="e-card">
                <span className="e-label">{t.labelActions}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {actions.map((item, i) => {
                    const isLast = i === actions.length - 1
                    return (
                      <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 500, color: 'var(--accent)',
                          minWidth: '16px', paddingTop: '3px', flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-2)' }}>
                          {sanitize(item)}
                          {frontier === 'required_actions' && isStreaming && isLast && <Cursor />}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── 3. Risks ── floating, visually isolated ─────────── */}
      {hasRisks && (
        <div className="e-section" style={{ '--reveal-delay': REVEAL.risks, marginTop: '8px' } as React.CSSProperties}>
          <div className="e-card-risk">
            <span className="e-label" style={{ color: 'var(--danger)', opacity: 0.7 }}>
              {t.labelRisks}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {risks.map((item, i) => {
                const isLast = i === risks.length - 1
                return (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', color: 'var(--danger)', opacity: 0.5, paddingTop: '4px', flexShrink: 0 }}>
                      ·
                    </span>
                    <span style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--danger)' }}>
                      {sanitize(item)}
                      {frontier === 'risks' && isStreaming && isLast && <Cursor />}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Next steps ── full width, reading flow ────────── */}
      {hasSteps && (
        <div className="e-section" style={{ '--reveal-delay': REVEAL.steps } as React.CSSProperties}>
          <div className="e-card">
            <span className="e-label">{t.labelSteps}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {steps.map((item, i) => {
                const isLast = i === steps.length - 1
                return (
                  <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--accent)',
                      minWidth: '18px',
                      paddingTop: '3px',
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                      opacity: 0.85,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-2)' }}>
                      {sanitize(item)}
                      {frontier === 'next_steps' && isStreaming && isLast && <Cursor />}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Uncertain + Sources ── editorial footer ─────────── */}
      {hasCheck && (
        <div className="e-section" style={{ '--reveal-delay': REVEAL.check } as React.CSSProperties}>
          <div className="e-card">
            {uncertain.length > 0 && (
              <>
                <span className="e-label">{t.labelCheck}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: sources.length > 0 ? '20px' : 0 }}>
                  {uncertain.map((item, i) => {
                    const isLast = i === uncertain.length - 1
                    return (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', paddingTop: '4px', flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-2)' }}>
                          {sanitize(item)}
                          {frontier === 'uncertain_points' && isStreaming && isLast && <Cursor />}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {sources.length > 0 && (
              <>
                <span className="e-label" style={{ marginTop: uncertain.length > 0 ? 0 : undefined }}>
                  {t.labelSources}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sources.map((item, i) => {
                    const isLast = i === sources.length - 1
                    return (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', paddingTop: '4px', flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-2)' }}>
                          {sanitize(item)}
                          {frontier === 'official_sources_to_check' && isStreaming && isLast && <Cursor />}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Analyzing screen ────────────────────────────────────────────

function AnalyzingScreen({ stage, docName, lang, dark, ocrMode }: {
  stage: number; docName: string | null; lang: Lang; dark: boolean; ocrMode: boolean
}) {
  const label = (ocrMode && stage === 0)
    ? OCR_STAGE[lang]
    : STAGES[lang][Math.min(stage, STAGES[lang].length - 1)]
  return (
    <div className="analyzing-screen" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <BlobParticles dark={dark} />
      <div className="analyzing-glow" />
      <div className="analyzing-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', paddingBottom: '8vh' }}>
        <span key={stage} className="analyzing-status" style={{ fontSize: '19px', fontWeight: 300, color: 'var(--text-2)', letterSpacing: '-0.012em', textAlign: 'center' }}>
          {label}
        </span>
        {docName && (
          <span style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileIcon />{docName}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────

export default function App() {
  const { lang, dark } = useApp()

  const [phase,        setPhase]        = useState<Phase>('welcome')
  const [revealed,     setRevealed]     = useState(false)
  const [displayStage, setDisplayStage] = useState(0)
  const [docName,      setDocName]      = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [ocrMode,      setOcrMode]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [hovered,      setHovered]      = useState(false)
  const [dragging,     setDragging]     = useState(false)

  const [isNative,    setIsNative]    = useState(false)

  const fileRef      = useRef<HTMLInputElement>(null)
  const lastStageAt  = useRef(Date.now())
  const stagePending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevStreaming = useRef(false)

  const { object, submit, isLoading: isStreaming, stop } = experimental_useObject({
    api: '/api/analyze',
    schema: analysisSchema,
    onError() {
      setError(lang === 'en' ? T.en.errServer : T.uk.errServer)
      setPhase('done')
    },
  })

  // ── Stage advancement ─────────────────────────────────────────

  const targetStage = useMemo(() => {
    if (!isStreaming && !object) return 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = object as any
    if (o?.next_steps?.length)          return 4
    if (o?.risks?.length)               return 3
    if (o?.deadlines?.length)           return 2
    if (o?.summary || o?.document_type) return 1
    return 0
  }, [object, isStreaming])

  useEffect(() => {
    if (targetStage <= displayStage) return
    if (stagePending.current) clearTimeout(stagePending.current)
    const elapsed = Date.now() - lastStageAt.current
    const delay   = Math.max(0, MIN_STAGE_MS - elapsed)
    stagePending.current = setTimeout(() => {
      stagePending.current = null
      setDisplayStage(s => {
        const next = Math.min(s + 1, targetStage)
        lastStageAt.current = Date.now()
        return next
      })
    }, delay)
    return () => { if (stagePending.current) clearTimeout(stagePending.current) }
  }, [targetStage, displayStage])

  // ── Stream end → transition ────────────────────────────────────

  useEffect(() => {
    if (prevStreaming.current && !isStreaming && object && phase === 'analyzing') {
      // Start exiting (overlay fades over 650ms)
      setPhase('exiting')
      // Fire cascade reveal slightly after exit begins (sections peek through the fade)
      revealTimer.current = setTimeout(() => setRevealed(true), 140)
      // Remove overlay after fade
      exitTimer.current = setTimeout(() => setPhase('done'), 820)
    }
    prevStreaming.current = isStreaming
  }, [isStreaming, object, phase])

  // ── Native platform detection ─────────────────────────────────

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform())
    }).catch(() => {})
  }, [])

  // ── Cleanup ───────────────────────────────────────────────────

  useEffect(() => () => {
    if (stagePending.current) clearTimeout(stagePending.current)
    if (exitTimer.current)    clearTimeout(exitTimer.current)
    if (revealTimer.current)  clearTimeout(revealTimer.current)
  }, [])

  // ── Actions ───────────────────────────────────────────────────

  function handleReset() {
    stop()
    if (stagePending.current) clearTimeout(stagePending.current)
    if (exitTimer.current)    clearTimeout(exitTimer.current)
    if (revealTimer.current)  clearTimeout(revealTimer.current)
    setPhase('welcome')
    setRevealed(false)
    setDisplayStage(0)
    setDocName(null)
    setError(null)
    setLoading(false)
    setOcrMode(false)
    prevStreaming.current = false
    lastStageAt.current = Date.now()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function mediaResultToFile(webPath: string): Promise<File> {
    const { Capacitor } = await import('@capacitor/core')
    const url = Capacitor.convertFileSrc(webPath)
    const resp = await fetch(url)
    const blob = await resp.blob()
    const ext = webPath.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mime = blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return new File([blob], `photo.${ext}`, { type: mime })
  }

  async function handleCamera() {
    try {
      const { Camera } = await import('@capacitor/camera')
      const result = await Camera.takePhoto({ quality: 90 })
      if (!result.webPath) return
      handleFile(await mediaResultToFile(result.webPath))
    } catch (e: unknown) {
      const msg = String((e as { errorMessage?: string })?.errorMessage ?? e)
      if (/cancel/i.test(msg)) return
      setError(t.errUpload)
    }
  }

  async function handleGallery() {
    try {
      const { Camera } = await import('@capacitor/camera')
      const result = await Camera.chooseFromGallery({ quality: 90 })
      const photo = result.results?.[0]
      if (!photo?.webPath) return
      handleFile(await mediaResultToFile(photo.webPath))
    } catch (e: unknown) {
      const msg = String((e as { errorMessage?: string })?.errorMessage ?? e)
      if (/cancel/i.test(msg)) return
      setError(t.errUpload)
    }
  }

  const t = T[lang]

  async function handleFile(file: File) {
    const isImage = /^image\/(jpeg|jpg|png|webp)$/i.test(file.type)
    const isPdf   = file.type === 'application/pdf' || (!isImage && file.name.toLowerCase().endsWith('.pdf'))
    if (!isImage && !isPdf) { setError(t.errPdfOnly); return }
    if (file.size > 10 * 1024 * 1024) { setError(t.errTooLarge); return }

    setError(null)
    setLoading(true)
    setOcrMode(isImage)
    setDocName(null)
    setRevealed(false)
    setDisplayStage(0)
    lastStageAt.current = Date.now()
    prevStreaming.current = false
    setPhase('analyzing')

    const fd = new FormData()
    fd.append('file', file)
    let docText: string
    try {
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json() as { error: string }
        const errKey = d.error === 'no_text' ? 'errNoText'
                     : (d.error === 'ocr_failed' || d.error === 'ocr_empty') ? 'errOcr'
                     : 'errReadFail'
        setError(t[errKey as keyof typeof t] as string)
        setLoading(false)
        setOcrMode(false)
        setPhase('welcome')
        return
      }
      const d = await res.json() as { text: string; ocr?: boolean }
      docText = d.text
      // If a scanned PDF triggered OCR, reflect that in the stage label
      if (d.ocr && !isImage) setOcrMode(true)
    } catch {
      setError(t.errUpload)
      setLoading(false)
      setOcrMode(false)
      setPhase('welcome')
      return
    }

    setDocName(file.name)
    setLoading(false)
    submit({ documentText: docText, lang })
  }

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      style={{ display: 'none' }}
      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
    />
  )

  // ── Welcome ───────────────────────────────────────────────────

  if (phase === 'welcome') {
    return (
      <main style={{ flex: 1, background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <ParticleField dark={dark} />
        {/* Tagline — sits directly below the header border, left-aligned */}
        <div style={{ position: 'relative', zIndex: 1, padding: '14px 24px 0', opacity: 0, animation: 'fade-in 0.9s ease 0.04s both' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{t.tagline}</span>
        </div>
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '10vh' }}>
          <div className="animate-slide-up" style={{ width: '100%', maxWidth: '560px', padding: '0 24px' }}>

            <div
              role="button" tabIndex={0} aria-label={t.uploadLabel}
              onClick={() => fileRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => { setHovered(false); setDragging(false) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
              onDrop={handleDrop}
              style={{
                minHeight: '340px',
                border: `1px dashed ${hovered || dragging ? 'var(--upload-hover-border)' : 'var(--upload-border)'}`,
                borderRadius: '24px',
                backgroundColor: hovered || dragging ? 'var(--upload-hover-bg)' : 'transparent',
                transition: 'border-color 0.3s ease, background-color 0.3s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '14px', cursor: 'pointer', outline: 'none',
              }}
            >
              {/* key remounts the element on state change — triggers text-appear animation */}
              <p
                key={dragging ? 'drag' : hovered ? 'hover' : 'default'}
                style={{
                  fontSize: '20px', fontWeight: 300,
                  color: hovered || dragging ? 'var(--text-2)' : 'var(--text-3)',
                  textAlign: 'center', lineHeight: 1.4, letterSpacing: '-0.01em', margin: 0,
                  opacity: 0,
                  animation: 'text-appear 0.32s cubic-bezier(0.30, 0, 0.36, 1) forwards',
                }}
              >
                {dragging ? t.uploadDrag : hovered ? t.uploadAction : t.uploadHint}
              </p>
              {(hovered || dragging) && (
                <span className="text-appear" style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.04em' }}>{t.uploadSize}</span>
              )}
            </div>

            {isNative && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleCamera}
                  style={{
                    flex: 1, height: '48px', border: '1px solid var(--upload-border)',
                    borderRadius: '12px', background: 'none', color: 'var(--text-2)',
                    fontSize: '14px', cursor: 'pointer', letterSpacing: '-0.01em',
                  }}
                >
                  {t.cameraLabel}
                </button>
                <button
                  onClick={handleGallery}
                  style={{
                    flex: 1, height: '48px', border: '1px solid var(--upload-border)',
                    borderRadius: '12px', background: 'none', color: 'var(--text-2)',
                    fontSize: '14px', cursor: 'pointer', letterSpacing: '-0.01em',
                  }}
                >
                  {t.galleryLabel}
                </button>
              </div>
            )}

            {error && (
              <p key={error} className="text-appear" style={{ fontSize: '13px', color: 'var(--danger)', textAlign: 'center', margin: '16px 0 0', lineHeight: '1.5' }}>{error}</p>
            )}
          </div>
        </div>
        {fileInput}
      </main>
    )
  }

  // ── Analyzing + Done (cross-fade) ─────────────────────────────

  const isAnalyzingVisible = phase === 'analyzing' || phase === 'exiting'
  const isResultVisible    = phase === 'done'       || phase === 'exiting'

  return (
    <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <ParticleField dark={dark} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Result — underneath, fades in as overlay dissolves */}
          <div style={{
            position: 'absolute', inset: 0,
            overflowY: 'auto', overscrollBehavior: 'contain',
            opacity: isResultVisible ? 1 : 0,
            transition: isResultVisible ? 'opacity 0.68s ease 0.20s' : 'none',
          }}>
            <div style={{ maxWidth: '660px', margin: '0 auto', padding: '36px 24px 96px' }}>

              {docName && (
                <div className="text-appear" style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ color: 'var(--text-3)' }}><FileIcon /></span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.02em' }}>{docName}</span>
                  </div>
                  {phase === 'done' && (
                    <button
                      onClick={handleReset}
                      style={{ fontSize: '12px', color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.28s ease' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                    >
                      {t.newDoc}
                    </button>
                  )}
                </div>
              )}

              {error && (
                <p key={error} className="text-appear" style={{ fontSize: '13px', color: 'var(--danger)', margin: '0 0 20px', lineHeight: '1.5' }}>{error}</p>
              )}

              <EditorialLayout
                object={object}
                isStreaming={isStreaming}
                revealed={revealed}
                lang={lang}
              />

            </div>
          </div>

          {/* Analyzing overlay — dissolves away when exiting */}
          {isAnalyzingVisible && (
            <div style={{
              position: 'absolute', inset: 0,
              opacity: phase === 'exiting' ? 0 : 1,
              transition: phase === 'exiting' ? 'opacity 0.72s ease' : 'none',
              pointerEvents: phase === 'exiting' ? 'none' : 'auto',
            }}>
              <AnalyzingScreen stage={displayStage} docName={docName} lang={lang} dark={dark} ocrMode={ocrMode} />
            </div>
          )}

        </div>
      </div>
      {fileInput}
    </div>
  )
}
