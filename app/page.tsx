'use client'

import { useState } from 'react'
import { UploadZone } from '@/components/upload-zone'
import { AnalysisView } from '@/components/analysis-view'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
        }
        setError(messages[errData.error] ?? `Невідома помилка: ${errData.error}`)
        return
      }

      // Read the plain-text stream and accumulate into a single JSON string
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      try {
        const cleaned = accumulated.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim()
        const parsed = JSON.parse(cleaned) as AnalysisData
        setData(parsed)
      } catch {
        setError(`Відповідь сервера: ${accumulated.slice(0, 300)}`)
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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">
            Бюрократ-хелпер
          </h1>
          <p className="text-lg text-slate-500">
            Завантажте офіційний документ — отримайте людське пояснення.
          </p>
        </header>

        {error && (
          <Alert className="mb-8 border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">{error}</AlertDescription>
          </Alert>
        )}

        {!data && !loading && (
          <UploadZone onFileSelect={handleFileSelect} isLoading={loading} />
        )}

        {(loading || data) && (
          <AnalysisView data={data ?? undefined} loading={loading} />
        )}

        {data && (
          <div className="mt-10 text-center">
            <button
              onClick={handleReset}
              className="text-sm text-slate-400 transition-colors hover:text-slate-600"
            >
              Проаналізувати інший документ
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
