import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnalysisData, Deadline } from '@/lib/types'

interface AnalysisViewProps {
  data?: AnalysisData
  loading: boolean
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/4" />
      </CardContent>
    </Card>
  )
}

function DeadlineList({ items }: { items: Deadline[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 italic">Не виявлено</p>
  }
  return (
    <ul className="space-y-3">
      {items.map((d, i) => (
        <li key={i} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">{d.what}</p>
          {d.when && (
            <p className="mt-0.5 text-slate-500">
              <span className="text-xs uppercase tracking-wide text-slate-400">Коли: </span>
              {d.when}
            </p>
          )}
          {d.consequence && (
            <p className="mt-0.5 text-slate-500">
              <span className="text-xs uppercase tracking-wide text-slate-400">Наслідок: </span>
              {d.consequence}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function StringList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 italic">Не виявлено</p>
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-600">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function AnalysisView({ data, loading }: AnalysisViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Card 1 — document type & summary */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Що це за документ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium text-slate-800">{data.document_type}</p>
          <p className="text-sm text-slate-600">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Card 2 — deadlines */}
      <Card>
        <CardHeader>
          <CardTitle>Дедлайни</CardTitle>
        </CardHeader>
        <CardContent>
          <DeadlineList items={data.deadlines} />
        </CardContent>
      </Card>

      {/* Card 3 — required actions */}
      <Card>
        <CardHeader>
          <CardTitle>Що треба зробити</CardTitle>
        </CardHeader>
        <CardContent>
          <StringList items={data.required_actions} />
        </CardContent>
      </Card>

      {/* Card 4 — risks */}
      <Card>
        <CardHeader>
          <CardTitle>Ризики якщо проігнорувати</CardTitle>
        </CardHeader>
        <CardContent>
          <StringList items={data.risks} />
        </CardContent>
      </Card>

      {/* Card 5 — next steps */}
      <Card>
        <CardHeader>
          <CardTitle>Наступні кроки</CardTitle>
        </CardHeader>
        <CardContent>
          <StringList items={data.next_steps} />
        </CardContent>
      </Card>

      {/* Card 6 — uncertain points + official sources */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Що варто перевірити окремо</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.uncertain_points.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Неоднозначні моменти
              </p>
              <StringList items={data.uncertain_points} />
            </div>
          )}
          {data.official_sources_to_check.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Офіційні джерела для перевірки
              </p>
              <StringList items={data.official_sources_to_check} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
