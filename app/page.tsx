'use client'

import { useState } from 'react'
import { UploadZone } from '@/components/upload-zone'
import { AnalysisView } from '@/components/analysis-view'
import type { AnalysisData } from '@/lib/types'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    setLoading(true)
    setError(null)
    setData(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = (await response.json()) as { error: string }
        const messages: Record<string, string> = {
          no_file: 'Файл не передано. Спробуйте ще раз.',
          no_text: 'PDF без тексту. Можливо, це скан.',
          parse_error: 'Не вдалося прочитати PDF. Файл може бути пошкоджений.',
          missing_api_key: 'Сервер не налаштований.',
        }
        setError(messages[errData.error] ?? `Помилка: ${errData.error}`)
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      try {
        const cleaned = accumulated
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
          .trim()
        setData(JSON.parse(cleaned) as AnalysisData)
      } catch {
        setError('Некоректна відповідь від сервера. Спробуйте ще раз.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setData(null)
    setError(null)
  }

  return (
    <main className="flex min-h-screen flex-col bg-stone-50 dark:bg-[#111110]">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">

        {/* Top bar */}
        <header className="flex items-center justify-between pt-10 pb-0">
          <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
            Бюрократ-хелпер
          </span>
          {data && (
            <button
              onClick={handleReset}
              className="text-xs text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-600 dark:hover:text-stone-400"
            >
              Новий документ
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-center py-16">
          {error && (
            <p className="mb-8 text-sm text-amber-600 dark:text-amber-400 animate-fade-in">
              {error}
            </p>
          )}

          {!data && !loading && (
            <div className="animate-fade-up">
              <UploadZone onFileSelect={handleFileSelect} isLoading={loading} />
            </div>
          )}

          {(loading || data) && (
            <AnalysisView data={data ?? undefined} loading={loading} />
          )}
        </div>

      </div>
    </main>
  )
}
