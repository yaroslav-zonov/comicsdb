'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ComicCard, { ComicCardData } from './ComicCard'
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
  stats?: string
}

export default function EventComicsView({ comics, title, stats }: EventComicsViewProps) {
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
        <div className="pb-4 border-b border-border-primary">
          <div className="flex items-center justify-between mb-2">
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
          {stats && (
            <p className="text-sm text-text-secondary">
              {stats}
            </p>
          )}
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
                    showDate={false}
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
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const placeholder = target.parentElement?.querySelector('.image-placeholder')
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display = 'flex'
                            }
                          }}
                        />
                        <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-bg-tertiary" style={{ display: 'none' }}>
                          <span className="text-text-tertiary text-xs">Нет обложки</span>
                        </div>
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
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-hidden hidden md:block pt-6">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="py-2 text-left text-xs text-text-secondary">#</th>
                <th className="py-2 text-left text-xs text-text-secondary">Обложка</th>
                <th className="py-2 text-left text-xs text-text-secondary">Название</th>
                <th className="py-2 text-left text-xs text-text-secondary">Дата публикации</th>
              </tr>
            </thead>
            <tbody>
              {tableComics.map(comic => {
                const coverImage = comic.super || comic.thumb || comic.tiny
                
                // Для комиксов с переводом
                if (comic.hasTranslation && comic.translation) {
                  return (
                    <>
                      {/* Десктопная версия */}
                      <tr key={comic.id} className="border-t border-border-primary first:border-t-0 hidden md:table-row">
                        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
                          {comic.order > 0 ? `#${comic.order}` : '-'}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <Link href={getComicUrl(comic.translation.series.publisher.id, comic.translation.series.id, comic.translation.comicvine)}>
                            <div className="relative w-12 aspect-[2/3]">
                              {coverImage ? (
                                <>
                                  <Image
                                    src={coverImage}
                                    alt={`${comic.name} #${comic.number}`}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                    loading="lazy"
                                    unoptimized
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const placeholder = target.parentElement?.querySelector('.image-placeholder')
                                      if (placeholder) {
                                        (placeholder as HTMLElement).style.display = 'flex'
                                      }
                                    }}
                                  />
                                  <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-bg-tertiary" style={{ display: 'none' }}>
                                    <span className="text-text-tertiary text-xs">Нет</span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                                  <span className="text-text-tertiary text-xs">Нет</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-3">
                          <div>
                            <Link
                              href={getComicUrl(comic.translation.series.publisher.id, comic.translation.series.id, comic.translation.comicvine)}
                              className="text-sm font-medium text-text-primary hover:text-accent transition-colors block"
                            >
                              {comic.name} #{comic.number}
                            </Link>
                            <Link
                              href={`/publishers/${comic.translation.series.publisher.id}`}
                              className="text-xs text-text-secondary hover:text-accent transition-colors"
                            >
                              {comic.translation.series.publisher.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
                          {comic.pdate ? formatDate(comic.pdate) : '-'}
                        </td>
                      </tr>
                      {/* Мобильная версия */}
                      <tr key={`${comic.id}-mobile`} className="border-t border-border-primary first:border-t-0 md:hidden">
                        <td className="py-2 px-2" colSpan={4}>
                          <div className="flex items-start gap-3">
                            <Link href={getComicUrl(comic.translation.series.publisher.id, comic.translation.series.id, comic.translation.comicvine)} className="flex-shrink-0">
                              <div className="relative w-10 aspect-[2/3]">
                                {coverImage ? (
                                  <>
                                    <Image
                                      src={coverImage}
                                      alt={`${comic.name} #${comic.number}`}
                                      fill
                                      className="object-cover"
                                      sizes="40px"
                                      loading="lazy"
                                      unoptimized
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const placeholder = target.parentElement?.querySelector('.image-placeholder')
                                        if (placeholder) {
                                          (placeholder as HTMLElement).style.display = 'flex'
                                        }
                                      }}
                                    />
                                    <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-bg-tertiary" style={{ display: 'none' }}>
                                      <span className="text-text-tertiary text-[10px]">Нет</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                                    <span className="text-text-tertiary text-[10px]">Нет</span>
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-text-primary">
                                {comic.order > 0 && <span className="text-text-secondary">#{comic.order} </span>}
                                {comic.name} #{comic.number}
                              </div>
                              <div className="text-xs text-text-secondary mt-1">
                                {comic.pdate ? formatDate(comic.pdate) : '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </>
                  )
                }

                // Для комиксов без перевода
                return (
                  <>
                    {/* Десктопная версия */}
                    <tr key={comic.id} className="border-t border-border-primary first:border-t-0 hidden md:table-row opacity-60">
                      <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
                        {comic.order > 0 ? `#${comic.order}` : '-'}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <div className="relative w-12 aspect-[2/3] bg-bg-tertiary">
                          {coverImage ? (
                            <>
                              <Image
                                src={coverImage}
                                alt={`${comic.name} #${comic.number}`}
                                fill
                                className="object-cover grayscale"
                                sizes="48px"
                                unoptimized
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const placeholder = target.parentElement?.querySelector('.image-placeholder')
                                  if (placeholder) {
                                    (placeholder as HTMLElement).style.display = 'flex'
                                  }
                                }}
                              />
                              <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-bg-tertiary" style={{ display: 'none' }}>
                                <span className="text-text-tertiary text-xs">Нет</span>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-text-tertiary text-xs">Нет</span>
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
                        {comic.pdate ? formatDate(comic.pdate) : '-'}
                      </td>
                    </tr>
                    {/* Мобильная версия */}
                    <tr key={`${comic.id}-mobile`} className="border-t border-border-primary first:border-t-0 md:hidden opacity-60">
                      <td className="py-2 px-2" colSpan={4}>
                        <div className="flex items-start gap-3">
                          <div className="relative w-10 aspect-[2/3] bg-bg-tertiary flex-shrink-0">
                            {coverImage ? (
                              <>
                                <Image
                                  src={coverImage}
                                  alt={`${comic.name} #${comic.number}`}
                                  fill
                                  className="object-cover grayscale"
                                  sizes="40px"
                                  unoptimized
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                    const placeholder = target.parentElement?.querySelector('.image-placeholder')
                                    if (placeholder) {
                                      (placeholder as HTMLElement).style.display = 'flex'
                                    }
                                  }}
                                />
                                <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-bg-tertiary" style={{ display: 'none' }}>
                                  <span className="text-text-tertiary text-[10px]">Нет</span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-text-tertiary text-[10px]">Нет</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text-tertiary">
                              {comic.order > 0 && <span className="text-text-secondary">#{comic.order} </span>}
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

