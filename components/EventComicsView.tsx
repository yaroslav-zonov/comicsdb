'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ComicCard, { ComicCardData } from './ComicCard'
import TableRow from './TableRow'
import ViewToggle, { ViewMode } from './ViewToggle'
import { getComicUrl, formatDate } from '@/lib/utils'

type EventComic = {
  id: number
  name: string
  number: number
  order: number
  tiny: string | null
  thumb: string | null
  super: string | null
  pdate: Date
  hasTranslation: boolean
  translation: {
    comicId: number
    comicvine: number
    series: {
      id: number
      name: string
      publisher: {
        id: number
        name: string
      }
    }
  } | null
}

type EventComicsViewProps = {
  comics: EventComic[]
  title?: string
}

export default function EventComicsView({ comics, title }: EventComicsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  if (comics.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Нет доступных комиксов</p>
      </div>
    )
  }

  // Группируем комиксы по comicvine для карточного вида (чтобы не дублировать)
  // Для комиксов без перевода используем id как ключ
  const groupedComics = new Map<string | number, EventComic[]>()
  comics.forEach(comic => {
    const key = comic.hasTranslation && comic.translation 
      ? comic.translation.comicvine 
      : comic.id
    if (!groupedComics.has(key)) {
      groupedComics.set(key, [])
    }
    groupedComics.get(key)!.push(comic)
  })

  // Для карточного вида берем первый комикс из каждой группы
  const displayComics = Array.from(groupedComics.values()).map(group => group[0])

  // Для табличного вида тоже группируем по comicvine (берем первый из каждой группы)
  const tableComics = Array.from(groupedComics.values()).map(group => group[0])

  return (
    <div>
      {(title || true) && (
        <div className="pb-4 border-b border-border-primary flex items-center justify-between">
          {title && (
            <h2 className="heading-section">
              {title}
            </h2>
          )}
          <div>
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showTableOnMobile={false}
            />
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="grid-cards pt-6">
          {displayComics.map(comic => {
            // Для комиксов с переводом используем ComicCard
            if (comic.hasTranslation && comic.translation) {
              const cardData: ComicCardData = {
                id: comic.translation.comicId,
                comicvine: comic.translation.comicvine,
                number: comic.number,
                series: comic.translation.series,
                thumb: comic.super || comic.thumb || null, // Используем super для лучшего качества
                tiny: comic.tiny || null,
                pdate: comic.pdate,
              }

              return (
                <div key={comic.id} className="relative">
                  <ComicCard
                    data={cardData}
                    showCover={true}
                    showTitle={true}
                    titleMode="full"
                    showDate={true}
                  />
                  {/* Порядковый номер в событии - поверх обложки */}
                  {comic.order > 0 && (
                    <div className="absolute top-2 left-2 z-20 bg-accent text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none">
                      #{comic.order}
                    </div>
                  )}
                </div>
              )
            }

            // Для комиксов без перевода - упрощенный дизайн
            const coverImage = comic.super || comic.thumb || comic.tiny
            return (
              <div key={comic.id} className="overflow-hidden group relative">
                <div className="block cursor-default">
                  <div className="relative aspect-[2/3] bg-bg-tertiary overflow-hidden shadow-sm">
                    {coverImage ? (
                      <>
                        <Image
                          src={coverImage}
                          alt={`${comic.name} #${comic.number}`}
                          fill
                          className="object-cover grayscale opacity-50"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          loading="lazy"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-bg-secondary/30" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                        <span className="text-text-tertiary text-xs">Нет обложки</span>
                      </div>
                    )}
                    {/* Порядковый номер в событии */}
                    {comic.order > 0 && (
                      <div className="absolute top-2 left-2 z-10 bg-accent text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none">
                        #{comic.order}
                      </div>
                    )}
                  </div>
                  <div className="pt-3">
                    <h3 className="font-semibold text-sm text-text-tertiary mb-1 line-clamp-2 opacity-60">
                      {comic.name} #{comic.number}
                    </h3>
                    {comic.pdate && (
                      <p className="body-tiny mt-1 text-text-tertiary opacity-60">
                        {formatDate(comic.pdate, { month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-hidden hidden md:block pt-6">
          <table className="min-w-full">
            <tbody>
              {tableComics.map(comic => {
                // Для комиксов с переводом используем TableRow
                if (comic.hasTranslation && comic.translation) {
                  return (
                    <TableRow
                      key={comic.id}
                      type="comic"
                      variant="main"
                      data={{
                        id: comic.translation.comicId,
                        comicvine: comic.translation.comicvine,
                        number: comic.number,
                        series: comic.translation.series,
                        thumb: comic.super || comic.thumb || null,
                        tiny: comic.tiny || null,
                        pdate: comic.pdate,
                      }}
                    />
                  )
                }

                // Для комиксов без перевода - упрощенная строка таблицы
                const coverImage = comic.super || comic.thumb || comic.tiny
                return (
                  <>
                    {/* Десктопная версия */}
                    <tr key={comic.id} className="border-t border-border-primary first:border-t-0 hidden md:table-row opacity-60">
                      <td className="py-3 whitespace-nowrap">
                        <div className="relative w-12 aspect-[2/3] bg-bg-tertiary">
                          {coverImage ? (
                            <Image
                              src={coverImage}
                              alt={`${comic.name} #${comic.number}`}
                              fill
                              className="object-cover grayscale"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-text-tertiary text-xs">Нет</span>
                            </div>
                          )}
                          {/* Порядковый номер */}
                          {comic.order > 0 && (
                            <div className="absolute top-0 left-0 bg-accent text-white text-[10px] font-semibold px-1 py-0.5 rounded">
                              #{comic.order}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="text-text-tertiary text-sm">
                          {comic.name} #{comic.number}
                        </div>
                      </td>
                      <td className="py-3 whitespace-nowrap text-sm text-text-tertiary">
                        -
                      </td>
                      <td className="py-3 whitespace-nowrap text-sm text-text-tertiary">
                        {comic.pdate ? formatDate(comic.pdate) : '-'}
                      </td>
                      <td className="py-3 whitespace-nowrap text-right pr-0">
                        <span className="text-text-muted" title="Ссылка недоступна">
                          <XMarkIcon className="w-5 h-5" />
                        </span>
                      </td>
                    </tr>
                    {/* Мобильная версия */}
                    <tr key={`${comic.id}-mobile`} className="border-t border-border-primary first:border-t-0 md:hidden opacity-60">
                      <td className="py-2 px-2" colSpan={5}>
                        <div className="flex items-start gap-3">
                          <div className="relative w-10 aspect-[2/3] bg-bg-tertiary flex-shrink-0">
                            {coverImage ? (
                              <Image
                                src={coverImage}
                                alt={`${comic.name} #${comic.number}`}
                                fill
                                className="object-cover grayscale"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-text-tertiary text-[10px]">Нет</span>
                              </div>
                            )}
                            {/* Порядковый номер */}
                            {comic.order > 0 && (
                              <div className="absolute top-0 left-0 bg-accent text-white text-[10px] font-semibold px-1 py-0.5 rounded">
                                #{comic.order}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text-tertiary">
                              {comic.name} #{comic.number}
                            </div>
                            <div className="text-xs text-text-tertiary mt-1">
                              {comic.pdate ? formatDate(comic.pdate) : '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

