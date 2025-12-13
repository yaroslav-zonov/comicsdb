'use client'

import { useState } from 'react'
import ComicCard, { ComicCardData } from './ComicCard'
import TableRow from './TableRow'
import ViewToggle, { ViewMode } from './ViewToggle'

export type ComicsListViewProps = {
  comics: ComicCardData[]
  title?: string
  showCover?: boolean
  showTitle?: boolean
  titleMode?: 'number-only' | 'full'
  showPublisher?: boolean
  showSite?: boolean
  showDate?: boolean
  tableVariant?: 'main' | 'comic-page' | 'character-creator-team' | 'scanlator' | 'series'
  showTableOnMobile?: boolean
  groupByNumber?: boolean
  className?: string
  additionalTableData?: Array<{
    id: number
    siteName?: string | null
    siteId?: string | null
    site2Name?: string | null
    site2Id?: string | null
    date?: Date | null
    link?: string | null
    translate?: string | null
    edit?: string | null
    pdate?: Date | null
    isJoint?: boolean
  }>
}

export default function ComicsListView({
  comics,
  title,
  showCover = true,
  showTitle = true,
  titleMode = 'full',
  showPublisher = false,
  showSite = false,
  showDate = false,
  tableVariant = 'main',
  showTableOnMobile = false,
  groupByNumber = false,
  className = '',
  additionalTableData,
}: ComicsListViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  if (comics.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Нет доступных комиксов</p>
      </div>
    )
  }

  // Группируем комиксы по номеру для карточного вида (чтобы не дублировать)
  const displayComics = groupByNumber
    ? (() => {
        const groupedByNumber = new Map<number, ComicCardData[]>()
        comics.forEach(comic => {
          const num = comic.number
          if (!groupedByNumber.has(num)) {
            groupedByNumber.set(num, [])
          }
          groupedByNumber.get(num)!.push(comic)
        })
        return Array.from(groupedByNumber.values()).map(group => group[0])
      })()
    : comics

  // Для таблицы при группировке используем все комиксы, но отображаем только уникальные по номеру
  const tableComics = groupByNumber ? displayComics : comics

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
            showTableOnMobile={showTableOnMobile}
          />
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-6">
          {displayComics.map((comic, idx) => {
            // Находим дополнительные данные для карточки
            let additional
            if (groupByNumber && additionalTableData) {
              const originalIdx = comics.findIndex(c => c.number === comic.number && c.id === comic.id)
              if (originalIdx >= 0) {
                additional = additionalTableData[originalIdx]
              } else {
                const firstMatch = comics.findIndex(c => c.number === comic.number)
                additional = firstMatch >= 0 ? additionalTableData[firstMatch] : undefined
              }
            } else {
              additional = additionalTableData?.[idx]
            }
            
            return (
              <ComicCard
                key={comic.id}
                data={{
                  ...comic,
                  site2Name: additional?.site2Name ?? (comic as any).site2Name,
                }}
                showCover={showCover}
                showTitle={showTitle}
                titleMode={titleMode}
                showPublisher={showPublisher}
                showSite={showSite}
                showDate={showDate}
              />
            )
          })}
        </div>
      ) : (
        <div className={`overflow-hidden ${showTableOnMobile ? '' : 'hidden md:block'} pt-6`}>
          <table className="min-w-full">
            <tbody>
              {(groupByNumber ? displayComics : comics).map((comic, idx) => {
                // Для группированных комиксов находим соответствующие данные из оригинального массива
                let additional
                if (groupByNumber && additionalTableData) {
                  // Находим первый комикс с таким же номером в оригинальном массиве
                  const originalIdx = comics.findIndex(c => c.number === comic.number && c.id === comic.id)
                  if (originalIdx >= 0) {
                    additional = additionalTableData[originalIdx]
                  } else {
                    const firstMatch = comics.findIndex(c => c.number === comic.number)
                    additional = firstMatch >= 0 ? additionalTableData[firstMatch] : undefined
                  }
                } else {
                  additional = additionalTableData?.[idx]
                }
                return (
                  <TableRow
                    key={comic.id}
                    type="comic"
                    variant={tableVariant}
                    data={{
                      id: comic.id,
                      comicvine: comic.comicvine,
                      number: comic.number,
                      series: comic.series,
                      thumb: comic.thumb,
                      tiny: comic.tiny,
                      siteName: additional?.siteName ?? comic.siteName,
                      siteId: additional?.siteId ?? (comic as any).siteId,
                      site2Name: additional?.site2Name ?? (comic as any).site2Name,
                      site2Id: additional?.site2Id ?? (comic as any).site2Id,
                      date: additional?.date ?? comic.date,
                      pdate: additional?.pdate ?? comic.pdate,
                      link: additional?.link ?? (comic as any).link,
                      translate: additional?.translate ?? (comic as any).translate,
                      edit: additional?.edit ?? (comic as any).edit,
                      hasGlobalEvent: (comic as any).hasGlobalEvent,
                      isJoint: additional?.isJoint ?? (comic as any).isJoint,
                    }}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

