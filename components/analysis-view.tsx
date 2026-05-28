import type { AnalysisData, Deadline } from '@/lib/types'

interface AnalysisViewProps {
  data?: AnalysisData
  loading: boolean
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs text-stone-400 dark:text-stone-600">
      {children}
    </p>
  )
}

function DeadlineList({ items }: { items: Deadline[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-5">
      {items.map((d, i) => (
        <div key={i} className="border-l border-stone-200 dark:border-stone-800 pl-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              {d.what}
            </span>
            {d.when && (
              <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
                {d.when}
              </span>
            )}
          </div>
          {d.consequence && (
            <p className="mt-1 text-xs leading-relaxed text-amber-600/70 dark:text-amber-400/60">
              {d.consequence}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function NumberedList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 tabular-nums text-stone-300 dark:text-stone-700 select-none">
            {i + 1}
          </span>
          <span className="text-stone-600 dark:text-stone-400">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function PlainList({ items, dim = false }: { items: string[]; dim?: boolean }) {
  if (items.length === 0) return null
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li
          key={i}
          className={`text-sm leading-relaxed ${
            dim
              ? 'text-stone-400 dark:text-stone-600'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 animate-fade-in">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1 w-1 rounded-full bg-stone-400 dark:bg-stone-600 animate-pulse-dot"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      <p className="text-sm text-stone-400 dark:text-stone-500">
        Читаю документ
      </p>
    </div>
  )
}

export function AnalysisView({ data, loading }: AnalysisViewProps) {
  if (loading) return <LoadingState />
  if (!data) return null

  return (
    <div className="space-y-12 animate-fade-in">

      {/* Summary - the hero */}
      <section className="animate-fade-up" style={{ animationDelay: '0ms' }}>
        <Note>{data.document_type}</Note>
        <p className="text-lg leading-relaxed text-stone-800 dark:text-stone-200">
          {data.summary}
        </p>
      </section>

      {/* Deadlines */}
      {data.deadlines.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <Note>дедлайни</Note>
          <DeadlineList items={data.deadlines} />
        </section>
      )}

      {/* Actions */}
      {data.required_actions.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <Note>що зробити</Note>
          <NumberedList items={data.required_actions} />
        </section>
      )}

      {/* Risks */}
      {data.risks.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '180ms' }}>
          <Note>якщо проігнорувати</Note>
          <PlainList items={data.risks} />
        </section>
      )}

      {/* Next steps */}
      {data.next_steps.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '240ms' }}>
          <Note>наступні кроки</Note>
          <NumberedList items={data.next_steps} />
        </section>
      )}

      {/* Uncertain + sources */}
      {(data.uncertain_points.length > 0 || data.official_sources_to_check.length > 0) && (
        <section className="animate-fade-up" style={{ animationDelay: '300ms' }}>
          <Note>уточнити</Note>
          <div className="space-y-6">
            {data.uncertain_points.length > 0 && (
              <PlainList items={data.uncertain_points} />
            )}
            {data.official_sources_to_check.length > 0 && (
              <PlainList items={data.official_sources_to_check} dim />
            )}
          </div>
        </section>
      )}

    </div>
  )
}
