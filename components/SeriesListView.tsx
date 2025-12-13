'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import TableRow from './TableRow'
import ViewToggle, { ViewMode } from './ViewToggle'
import { getSeriesUrl } from '@/lib/utils'

export type SeriesData = {
  id: number
  name: string
  volume: string
  publisher: {
    id: number
    name: string
  }
  thumb: string | null
  status?: string
  comicvine?: number
  comicsCount: number
  total?: number
}

export type SeriesListViewProps = {
  series: SeriesData[]
  title?: string
  className?: string
}

export default function SeriesListView({
  series,
  title,
  className = '',
}: SeriesListViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  if (series.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Нет доступных серий</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {(title || true) && (
        <div className="pb-4 border-b border-border-primary flex items-center justify-between">
          {title && (
            <h2 className="text-2xl font-bold text-text-primary">
              {title}
            </h2>
          )}
          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showTableOnMobile={false}
          />
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-6">
          {series.map((s) => (
            <div key={s.id} className="overflow-hidden group">
              <Link
                href={getSeriesUrl(s.publisher.id, s.id)}
                className="block"
              >
                <div className="relative aspect-[2/3] bg-gray-200">
                  {s.thumb ? (
                    <Image
                      src={s.thumb}
                      alt={s.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-text-tertiarytext-xs">Нет обложки</span>
                    </div>
                  )}
                </div>
                <div className="pt-3">
                  <h3 className="font-semibold text-sm text-text-primary mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                    {s.name}
                    {s.volume && s.volume !== '0' && (
                      <span className="text-text-secondary ml-1">({s.volume})</span>
                    )}
                  </h3>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden hidden md:block pt-6">
          <table className="min-w-full">
            <tbody>
              {series.map((s) => (
                <TableRow
                  key={s.id}
                  type="series"
                  variant="search"
                  data={s}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

