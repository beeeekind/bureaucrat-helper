'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message } from '@/lib/types'

// ─── Inline markdown: **bold**, numbered lists, line breaks ────────────────

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} style={{ color: 'var(--ink)', fontWeight: 600 }}>
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const isLast = li === lines.length - 1
        const m = line.match(/^(\d+)[.)]\s+(.+)$/)
        if (m) {
          return (
            <span key={li} style={{ display: 'flex', gap: '10px', marginTop: li === 0 ? 0 : '4px' }}>
              <span style={{ color: 'var(--muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums', userSelect: 'none' }}>
                {m[1]}.
              </span>
              <span><InlineMarkdown text={m[2]} /></span>
            </span>
          )
        }
        return (
          <span key={li}>
            <InlineMarkdown text={line} />
            {!isLast && <br />}
          </span>
        )
      })}
    </>
  )
}

// ─── Typing indicator ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: 'var(--dot)',
            animation: 'pulse-dot 1.1s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Message ────────────────────────────────────────────────────────────────

function Bubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            maxWidth: '72%',
            backgroundColor: 'var(--bubble-bg)',
            color: 'var(--bubble-fg)',
            borderRadius: '18px',
            borderTopRightRadius: '5px',
            padding: '10px 16px',
            fontSize: '14px',
            lineHeight: '1.55',
          }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <p style={{
        maxWidth: '85%',
        fontSize: '14px',
        lineHeight: '1.75',
        color: 'var(--ink-2)',
        margin: 0,
      }}>
        <Markdown text={message.content} />
      </p>
    </div>
  )
}

// ─── Welcome ────────────────────────────────────────────────────────────────

function Welcome({ onFile, onDrop }: { onFile: () => void; onDrop: (file: File) => void }) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onDrop(file)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 20px',
        gap: '20px',
        animation: 'fade-in 0.5s ease-out forwards',
      }}
    >
      {/* Subtitle top center */}
      <p style={{
        fontSize: '12px',
        color: 'var(--muted)',
        letterSpacing: '0.04em',
        margin: 0,
        textAlign: 'center',
      }}>
        Ваш помічник з офіційними документами
      </p>

      {/* Big upload rectangle */}
      <div
        role="button"
        tabIndex={0}
        onClick={onFile}
        onKeyDown={e => e.key === 'Enter' && onFile()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setDragging(false) }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
        onDrop={handleDrop}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '560px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20px',
          border: `1.5px dashed ${dragging ? 'var(--faint)' : hovered ? 'var(--faint)' : 'var(--line)'}`,
          backgroundColor: dragging ? 'color-mix(in srgb, var(--ink) 3%, transparent)' : hovered ? 'color-mix(in srgb, var(--ink) 2%, transparent)' : 'transparent',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
          outline: 'none',
          minHeight: '200px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '0 24px' }}>
          <p style={{
            fontSize: '15px',
            color: hovered || dragging ? 'var(--ink-2)' : 'var(--muted)',
            textAlign: 'center',
            margin: 0,
            transition: 'color 0.2s',
            lineHeight: '1.5',
            userSelect: 'none',
          }}>
            {dragging
              ? 'Відпустіть - розберемося'
              : hovered
              ? 'Натисніть або перетягніть PDF'
              : 'Що цей документ від вас хоче?'}
          </p>
          <p style={{
            fontSize: '11px',
            color: 'var(--faint)',
            margin: 0,
            userSelect: 'none',
            transition: 'opacity 0.2s',
            opacity: dragging ? 0 : 1,
          }}>
            до 10 МБ
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [documentContext, setDocumentContext] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function streamResponse(
    next: { role: 'user' | 'assistant'; content: string }[],
    ctx: string | null,
  ) {
    setLoading(true)
    setStreaming('')
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, documentContext: ctx ?? undefined }),
      })
      if (!res.ok) {
        const d = await res.json() as { error: string }
        setError(d.error === 'missing_api_key' ? 'Сервер не налаштований.' : 'Помилка сервера.')
        setLoading(false)
        return
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setStreaming(acc)
      }
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: acc }])
      setStreaming('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка зв\'язку.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const next = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, userMsg])
    await streamResponse(next, documentContext)
  }

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') { setError('Тільки PDF.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Максимум 10 МБ.'); return }
    setError(null)
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    let docText: string
    try {
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json() as { error: string }
        setError(d.error === 'no_text' ? 'PDF без тексту - можливо, це скан.' : 'Не вдалося прочитати PDF.')
        setLoading(false)
        return
      }
      const d = await res.json() as { text: string }
      docText = d.text
    } catch {
      setError('Помилка завантаження.')
      setLoading(false)
      return
    }
    setDocumentContext(docText)
    setDocumentName(file.name)
    setLoading(false)
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: `📎 ${file.name}` }
    const apiMsg = { role: 'user' as const, content: `📎 ${file.name} - проаналізуй цей документ і поясни що мені треба знати.` }
    setMessages(prev => [...prev, userMsg])
    await streamResponse([apiMsg], docText)
  }

  function handleReset() {
    setMessages([])
    setDocumentContext(null)
    setDocumentName(null)
    setStreaming('')
    setInput('')
    setError(null)
  }

  const isEmpty = messages.length === 0 && !loading
  const placeholder = documentContext ? 'Задайте питання про документ...' : 'Питання або PDF...'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--ink)' }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: '52px',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.2em', color: 'var(--ink)' }}>
          SVII
        </span>
        {!isEmpty && (
          <button
            onClick={handleReset}
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              padding: '4px 0',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            Новий чат
          </button>
        )}
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isEmpty ? (
          <Welcome onFile={() => fileRef.current?.click()} onDrop={handleFile} />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <div style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {messages.map((msg, i) => (
                <div key={msg.id} style={{ animation: 'fade-up 0.35s ease-out forwards', animationDelay: `${Math.min(i * 25, 100)}ms`, opacity: 0 }}>
                  <Bubble message={msg} />
                </div>
              ))}

              {loading && (
                <div style={{ animation: 'fade-in 0.2s ease-out forwards', opacity: 0 }}>
                  {streaming ? (
                    <p style={{ maxWidth: '85%', fontSize: '14px', lineHeight: '1.75', color: 'var(--ink-2)', margin: 0 }}>
                      <Markdown text={streaming} />
                    </p>
                  ) : <TypingDots />}
                </div>
              )}

              {error && (
                <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0, animation: 'fade-in 0.2s ease-out forwards', opacity: 0 }}>
                  {error}
                </p>
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* Input bar */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--line)',
          padding: `12px 16px max(14px, env(safe-area-inset-bottom)) 16px`,
        }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>

            {/* PDF button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              title="Завантажити PDF"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                flexShrink: 0,
                borderRadius: '10px',
                border: 'none',
                background: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                transition: 'color 0.15s',
                opacity: loading ? 0.3 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              {documentContext && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--doc-dot)',
                }} />
              )}
            </button>

            {/* Text input */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              borderRadius: '14px',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--surface)',
              padding: '10px 16px',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={placeholder}
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'var(--ink)',
                  caretColor: 'var(--ink)',
                  opacity: loading ? 0.4 : 1,
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                flexShrink: 0,
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--send-bg)',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                opacity: !input.trim() || loading ? 0.2 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 11V2M6.5 2L3 5.5M6.5 2L10 5.5" stroke="var(--send-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

          </div>

          {/* Active document name */}
          {documentName && (
            <div style={{ maxWidth: '560px', margin: '6px auto 0', paddingLeft: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.02em' }}>
                {documentName}
              </span>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )
}
