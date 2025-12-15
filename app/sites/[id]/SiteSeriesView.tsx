'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ViewToggle, { ViewMode } from '@/components/ViewToggle'
import { getImageUrl, getSeriesUrl, getComicUrl, formatDate } from '@/lib/utils'

type SeriesData = {
  id: number
  name: string
  publisher: { id: number; name: string }
  comics: Array<{ id: number; comicvine: number; number: number; date: Date | null; pdate: Date | null }>
  lastDate: Date
  thumb: string | null
}

export default function SiteSeriesView({ series }: { series: SeriesData[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  if (series.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Нет доступных серий</p>
      </div>
    )
  }

  return (
    <div>
      <div className="pb-4 border-b border-border-primary flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Серии</h2>
        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showTableOnMobile={false}
        />
      </div>

      {viewMode === 'cards' ? (
        <div className="grid-cards">
          {series.map((s) => (
            <div key={s.id} className="overflow-hidden group card-lift">
              <Link
                href={getSeriesUrl(s.publisher.id, s.id)}
                className="block"
              >
                <div className="relative aspect-[2/3] bg-bg-tertiary dark:bg-bg-card">
                  {s.thumb && getImageUrl(s.thumb) ? (
                    <Image
                      src={getImageUrl(s.thumb)!}
                      alt={s.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-text-tertiary text-xs">Нет обложки</span>
                    </div>
                  )}
                </div>
                <div className="pt-3">
                  <h3 className="font-semibold text-sm text-text-primary mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                    {s.name}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {s.publisher.name}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden hidden md:block">
          <table className="min-w-full">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Название серии</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Номера</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Дата последнего перевода</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {series.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="px-6 py-4">
                    <Link
                      href={getSeriesUrl(s.publisher.id, s.id)}
                      className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
                    >
                      {s.name}
                    </Link>
                    <p className="text-xs text-text-secondary mt-1">
                      {s.publisher.name}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {s.comics
                        .sort((a, b) => a.number - b.number)
                        .map((comic) => (
                          <Link
                            key={comic.id}
                            href={getComicUrl(s.publisher.id, s.id, comic.comicvine)}
                            className="text-sm text-accent hover:text-accent-hover hover:text-accent hover:underline"
                          >
                            #{comic.number}
                          </Link>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {formatDate(s.lastDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

