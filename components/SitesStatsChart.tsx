import Link from 'next/link'

type SiteStat = {
  id: string
  name: string
  count: number
}

type SitesStatsChartProps = {
  data: SiteStat[]
}

export default function SitesStatsChart({ data }: SitesStatsChartProps) {
  if (data.length === 0) {
    return <p className="text-text-secondary">Нет данных для отображения</p>
  }

  const maxCount = Math.max(...data.map(s => s.count), 1)

  return (
    <div className="bg-bg-card rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Переводы по сайтам</h3>
      <div className="space-y-3">
        {data.map((site, index) => {
          const percentage = (site.count / maxCount) * 100
          return (
            <div key={site.id} className="flex items-center gap-4">
              <div className="w-8 text-sm font-semibold text-text-secondary flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <Link
                    href={`/sites/${site.id}`}
                    className="text-sm font-medium text-text-primary hover:text-accent transition-colors truncate"
                    title={site.name}
                  >
                    {site.name}
                  </Link>
                  <span className="text-sm text-text-secondary ml-4 flex-shrink-0">
                    {site.count.toLocaleString('ru-RU')} {site.count === 1 ? 'перевод' : site.count < 5 ? 'перевода' : 'переводов'}
                  </span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
