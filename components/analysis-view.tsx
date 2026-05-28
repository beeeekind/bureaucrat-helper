import type { AnalysisData, Deadline } from '@/lib/types'

interface AnalysisViewProps {
  data?: AnalysisData
  loading: boolean
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500">
      {children}
    </p>
  )
}

function Divider() {
  return <hr className="border-stone-100 dark:border-stone-800/80" />
}

function Empty() {
  return (
    <p className="mt-3 text-sm italic text-stone-300 dark:text-stone-600">
      Не виявлено
    </p>
  )
}

function DeadlineList({ items }: { items: Deadline[] }) {
  if (items.length === 0) return <Empty />
  return (
    <ul className="mt-4 space-y-4">
      {items.map((d, i) => (
        <li key={i}>
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {d.what}
            </span>
            {d.when && (
              <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {d.when}
              </span>
            )}
          </div>
          {d.consequence && (
            <p className="mt-1 text-xs leading-relaxed text-amber-600/80 dark:text-amber-400/60">
              {d.consequence}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function StringList({ items }: { items: string[] }) {
  if (items.length === 0) return <Empty />
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-5 animate-fade-in">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-stone-500 animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
          Аналізую документ
        </p>
        <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
          Зазвичай 10–20 секунд
        </p>
      </div>
    </div>
  )
}

export function AnalysisView({ data, loading }: AnalysisViewProps) {
  if (loading) return <LoadingState />
  if (!data) return null

  const sections = [
    data.required_actions.length > 0 && (
      <section key="actions" className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <SectionLabel>Що треба зробити</SectionLabel>
        <StringList items={data.required_actions} />
      </section>
    ),
    data.risks.length > 0 && (
      <section key="risks" className="animate-fade-up" style={{ animationDelay: '180ms' }}>
        <SectionLabel>Ризики якщо проігнорувати</SectionLabel>
        <StringList items={data.risks} />
      </section>
    ),
    data.next_steps.length > 0 && (
      <section key="steps" className="animate-fade-up" style={{ animationDelay: '240ms' }}>
        <SectionLabel>Наступні кроки</SectionLabel>
        <StringList items={data.next_steps} />
      </section>
    ),
    (data.uncertain_points.length > 0 || data.official_sources_to_check.length > 0) && (
      <section key="check" className="animate-fade-up" style={{ animationDelay: '300ms' }}>
        <SectionLabel>Що варто перевірити окремо</SectionLabel>
        {data.uncertain_points.length > 0 && (
          <StringList items={data.uncertain_points} />
        )}
        {data.official_sources_to_check.length > 0 && (
          <div className={data.uncertain_points.length > 0 ? 'mt-5' : ''}>
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-stone-300 dark:text-stone-600 mb-2">
              Офіційні джерела
            </p>
            <StringList items={data.official_sources_to_check} />
          </div>
        )}
      </section>
    ),
  ].filter(Boolean)

  return (
    <div className="space-y-10">
      {/* Document type + summary */}
      <section className="animate-fade-up" style={{ animationDelay: '0ms' }}>
        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
          {data.document_type}
        </span>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          {data.summary}
        </p>
      </section>

      {data.deadlines.length > 0 && (
        <>
          <Divider />
          <section className="animate-fade-up" style={{ animationDelay: '60ms' }}>
            <SectionLabel>Дедлайни</SectionLabel>
            <DeadlineList items={data.deadlines} />
          </section>
        </>
      )}

      {sections.map((section, i) => (
        <div key={i}>
          <Divider />
          {section}
        </div>
      ))}
    </div>
  )
}
