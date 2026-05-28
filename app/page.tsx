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
          no_file: 'Файл не було передано. Спробуйте ще раз.',
          no_text: 'Цей PDF не містить тексту. Можливо, це скан — підтримка сканів додається пізніше.',
          parse_error: 'Не вдалося прочитати PDF. Файл може бути пошкоджений або зашифрований.',
          missing_api_key: 'Сервер не налаштований. Зверніться до адміністратора.',
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
        const parsed = JSON.parse(cleaned) as AnalysisData
        setData(parsed)
      } catch {
        setError('Отримано некоректну відповідь від сервера. Спробуйте ще раз.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Помилка з'єднання: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setData(null)
    setError(null)
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-[#111110]">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">

        {/* Header — hidden once results are shown */}
        {!data && (
          <header className="mb-14 animate-fade-up">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              beta
            </div>
            <h1 className="text-[2rem] font-medium leading-tight tracking-tight text-stone-900 dark:text-stone-50">
              Бюрократ-хелпер
            </h1>
            <p className="mt-2.5 text-base leading-relaxed text-stone-500 dark:text-stone-400">
              Завантажте офіційний документ — отримайте людське пояснення.
            </p>
          </header>
        )}

        {/* Error */}
        {error && (
          <div className="mb-10 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-800/20 dark:bg-amber-950/20">
            <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
          </div>
        )}

        {/* Upload */}
        {!data && !loading && (
          <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <UploadZone onFileSelect={handleFileSelect} isLoading={loading} />
          </div>
        )}

        {/* Analysis */}
        {(loading || data) && (
          <AnalysisView data={data ?? undefined} loading={loading} />
        )}

        {/* Reset */}
        {data && (
          <div className="mt-16 text-center">
            <button
              onClick={handleReset}
              className="text-xs text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-600 dark:hover:text-stone-400"
            >
              ← Проаналізувати інший документ
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
