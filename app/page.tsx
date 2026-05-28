'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

// ─── Markdown renderer (bold + line breaks) ────────────────────────────────

function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, li, arr) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <span key={li}>
            {parts.map((part, pi) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={pi} className="font-semibold text-stone-800 dark:text-stone-200">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={pi}>{part}</span>
              )
            )}
            {li < arr.length - 1 && <br />}
          </span>
        )
      })}
    </>
  )
}

// ─── Typing indicator ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1 w-1 rounded-full bg-stone-400 dark:bg-stone-600 animate-pulse-dot"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  )
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function Bubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-stone-900 px-4 py-2.5 text-sm leading-relaxed text-stone-50 dark:bg-stone-100 dark:text-stone-900">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        <Markdown text={message.content} />
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [documentContext, setDocumentContext] = useState<string | null>(null)
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
    nextMessages: { role: 'user' | 'assistant'; content: string }[],
    context: string | null
  ) {
    setLoading(true)
    setStreaming('')
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          documentContext: context ?? undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error === 'missing_api_key' ? 'Сервер не налаштований.' : 'Помилка сервера.')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreaming(accumulated)
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: accumulated },
      ])
      setStreaming('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка з\'єднання.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const nextMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))
    setMessages((prev) => [...prev, userMsg])
    await streamResponse(nextMessages, documentContext)
  }

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Тільки PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Максимум 10 МБ.')
      return
    }

    setError(null)
    setLoading(true)

    // Step 1: extract text
    const formData = new FormData()
    formData.append('file', file)

    let docText: string
    try {
      const res = await fetch('/api/extract', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(
          data.error === 'no_text'
            ? 'PDF без тексту - можливо, це скан.'
            : 'Не вдалося прочитати PDF.'
        )
        setLoading(false)
        return
      }
      const data = await res.json() as { text: string }
      docText = data.text
    } catch {
      setError('Помилка завантаження.')
      setLoading(false)
      return
    }

    setDocumentContext(docText)
    setLoading(false)

    // Step 2: send initial message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `📎 ${file.name}`,
    }
    const assistantInstruction = {
      role: 'user' as const,
      content: `📎 ${file.name} — проаналізуй цей документ і поясни що мені треба знати.`,
    }
    setMessages((prev) => [...prev, userMsg])
    await streamResponse([assistantInstruction], docText)
  }

  function handleReset() {
    setMessages([])
    setDocumentContext(null)
    setStreaming('')
    setInput('')
    setError(null)
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <div className="flex h-screen flex-col bg-stone-50 dark:bg-[#111110]">

      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800/60">
        <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
          Бюрократ-хелпер
        </span>
        {!isEmpty && (
          <button
            onClick={handleReset}
            className="text-xs text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-600 dark:hover:text-stone-400"
          >
            Новий чат
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-8">

          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-28 text-center animate-fade-in">
              <p className="text-sm text-stone-400 dark:text-stone-500">
                Завантажте документ або задайте питання
              </p>
            </div>
          )}

          <div className="space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-fade-up">
                <Bubble message={msg} />
              </div>
            ))}

            {loading && (
              <div className="animate-fade-in">
                {streaming ? (
                  <div className="max-w-[85%] text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    <Markdown text={streaming} />
                  </div>
                ) : (
                  <TypingDots />
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400 animate-fade-in">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-stone-100 px-5 py-4 dark:border-stone-800/60"
           style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">

          {/* PDF button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            title="Завантажити PDF"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 2h7l3 3v8.5H2.5V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M9.5 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Text input */}
          <div className={cn(
            'flex flex-1 items-center rounded-2xl border px-4 py-2.5 transition-colors',
            'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
          )}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Запитайте про документ..."
              disabled={loading}
              className="w-full bg-transparent text-sm text-stone-800 placeholder-stone-400 outline-none disabled:opacity-50 dark:text-stone-200 dark:placeholder-stone-600"
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-stone-50 transition-opacity hover:opacity-80 disabled:opacity-20 dark:bg-stone-100 dark:text-stone-900"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 11.5V1.5M6.5 1.5L2.5 5.5M6.5 1.5L10.5 5.5"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
