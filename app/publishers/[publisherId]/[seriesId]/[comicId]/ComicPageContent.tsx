'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TableRow from '@/components/TableRow'
import ComicNavigationFAB from '@/components/ComicNavigationFAB'
import Accordion from '@/components/Accordion'
import TranslationBottomSheet from '@/components/TranslationBottomSheet'
import { decodeHtmlEntities, getComicUrl, getSeriesUrl, formatDate } from '@/lib/utils'

type Comic = {
  id: number
  comicvine: number
  number: number
  pdate: Date | null
  date: Date | null
  series: {
    id: number
    name: string
    publisher: {
      id: number
      name: string
    }
  }
  thumb: string | null
  tiny: string | null
  small: string | null
  super: string | null
  translate: string
  edit: string
  creators: string
  characters: string
  teams: string
  adddate: Date | null
  translations: Array<{
    id: number
    siteName: string
    siteId: string
    site2Name?: string | null
    site2Id?: string | null
    link: string
    translate: string
    edit: string
    date: Date | null
    isJoint: boolean
  }>
  globalEvent?: {
    id: number
    globalId: string
    name: string
    genreName: string | null
    order: number
  } | null
  prevIssue: { comicvine: number; number: number } | null
  nextIssue: { comicvine: number; number: number } | null
}

export default function ComicPageContent({ comic }: { comic: Comic }) {
  const coverImage = comic.super || comic.thumb || comic.small || comic.tiny
  const [selectedTranslation, setSelectedTranslation] = useState<Comic['translations'][0] | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const handleTranslationInfoClick = (translation: Comic['translations'][0]) => {
    setSelectedTranslation(translation)
    setIsBottomSheetOpen(true)
  }

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Хлебные крошки и навигация по выпускам - только на десктопе */}
        <div className="mb-6 hidden md:flex md:items-center md:justify-between gap-2">
          <nav className="text-sm">
            <ol className="flex items-center space-x-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href={`/publishers/${comic.series.publisher.id}`}
                  className="hover:text-accent transition-colors"
                >
                  {comic.series.publisher.name}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href={getSeriesUrl(comic.series.publisher.id, comic.series.id)}
                  className="hover:text-accent transition-colors"
                >
                  {comic.series.name}
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">#{comic.number}</li>
            </ol>
          </nav>

          {/* Навигация по выпускам */}
          <div className="flex items-center justify-end gap-2 text-sm">
            {comic.prevIssue ? (
              <Link
                href={getComicUrl(comic.series.publisher.id, comic.series.id, comic.prevIssue.comicvine)}
                className="text-text-secondary hover:text-accent transition-colors"
              >
                ← #{comic.prevIssue.number}
              </Link>
            ) : (
              <span className="text-text-tertiary">←</span>
            )}
            <span className="text-text-tertiary">|</span>
            {comic.nextIssue ? (
              <Link
                href={getComicUrl(comic.series.publisher.id, comic.series.id, comic.nextIssue.comicvine)}
                className="text-text-secondary hover:text-accent transition-colors"
              >
                #{comic.nextIssue.number} →
              </Link>
            ) : (
              <span className="text-text-tertiary">→</span>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Обложка */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="relative w-48 md:w-80 aspect-[2/3]">
                {coverImage ? (
                  <>
                    <Image
                      src={coverImage}
                      alt={`${comic.series.name} #${comic.number}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 256px, 320px"
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
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                    <span className="text-text-tertiary text-xs">Нет обложки</span>
                  </div>
                )}
              </div>
            </div>

            {/* Информация */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4 text-center md:text-left">
                {comic.series.name} #{comic.number}
              </h1>

              <div className="space-y-6">
                {/* Издательство + дата публикации */}
                <div className="text-sm text-text-primary text-center md:text-left">
                  <Link
                    href={`/publishers/${comic.series.publisher.id}`}
                    className="text-text-primary hover:text-accent hover:underline transition-colors"
                  >
                    {comic.series.publisher.name}
                  </Link>
                  <span className="text-text-tertiary mx-2">•</span>
                  <span>
                    {comic.pdate ? formatDate(comic.pdate, { month: 'long', year: 'numeric' }).replace(/^./, (m) => m.toUpperCase()) : 'Дата неизвестна'}
                  </span>
                </div>

                {/* Таблица переводов */}
                {comic.translations && comic.translations.length > 0 && (
                  <div className="pt-4 border-t border-border-primary">
                    <h2 className="text-sm font-medium text-text-secondary mb-4">Переводы</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-border-primary">
                            <th className="py-2 text-left text-xs text-text-secondary">Сайт</th>
                            <th className="py-2 text-left text-xs text-text-secondary hidden lg:table-cell">Перевод</th>
                            <th className="py-2 text-left text-xs text-text-secondary hidden lg:table-cell">Оформление</th>
                            <th className="py-2 text-left text-xs text-text-secondary">Дата</th>
                            <th className="py-2 text-right text-xs text-text-secondary"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {comic.translations.map((translation) => (
                            <TableRow
                              key={translation.id}
                              type="comic"
                              variant="comic-page"
                              data={{
                                id: translation.id,
                                comicvine: comic.comicvine,
                                number: comic.number,
                                series: comic.series,
                                siteName: translation.siteName,
                                siteId: translation.siteId,
                                site2Name: translation.site2Name,
                                site2Id: translation.site2Id,
                                translate: translation.translate,
                                edit: translation.edit,
                                date: translation.date,
                                link: translation.link,
                                isJoint: translation.isJoint,
                              }}
                              onInfoClick={() => handleTranslationInfoClick(translation)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Глобальное событие */}
                {comic.globalEvent && (
                  <div className="pt-4 border-t border-border-primary">
                    <h3 className="text-sm font-medium text-text-secondary mb-2">
                      Глобальное событие
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/globals/${comic.series.publisher.id}/${comic.globalEvent.globalId}`}
                        className="text-sm text-text-primary hover:text-accent hover:underline transition-colors"
                      >
                        {comic.globalEvent.name}
                      </Link>
                      {comic.globalEvent.order > 0 && (
                        <span className="text-sm text-text-secondary">(#{comic.globalEvent.order})</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Создатели, персонажи, команды - кликабельные */}
                {(comic.creators || comic.characters || comic.teams) && (
                  <div className="pt-4 border-t border-border-primary space-y-4">
                    {/* Десктопная версия - без аккордеона */}
                    <div className="hidden md:block space-y-4">
                    {comic.creators && (
                      <div>
                        <h3 className="text-sm font-medium text-text-secondary mb-2">
                          Создатели
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            // Парсим строку с учетом скобок и запятых внутри них
                            const parts: Array<{ name: string; role: string | null }> = []
                            let current = ''
                            let inParens = false
                            let parensContent = ''
                            
                            for (let i = 0; i < comic.creators.length; i++) {
                              const char = comic.creators[i]
                              
                              if (char === '(') {
                                inParens = true
                                parensContent = ''
                              } else if (char === ')') {
                                inParens = false
                              } else if (char === ',' && !inParens) {
                                const trimmed = current.trim()
                                if (trimmed) {
                                  parts.push({
                                    name: trimmed,
                                    role: parensContent ? parensContent.trim() : null,
                                  })
                                }
                                current = ''
                                parensContent = ''
                              } else {
                                if (inParens) {
                                  parensContent += char
                                } else {
                                  // Убираем множественные пробелы
                                  if (char === ' ' && current.endsWith(' ')) {
                                    continue
                                  }
                                  current += char
                                }
                              }
                            }
                            
                            // Добавляем последний элемент
                            const trimmed = current.trim()
                            if (trimmed) {
                              parts.push({
                                name: trimmed,
                                role: parensContent ? parensContent.trim() : null,
                              })
                            }
                            
                            return parts.map((part, idx) => (
                              <span key={idx} className="text-sm text-text-primary">
                                <Link
                                  href={`/search?q=${encodeURIComponent(part.name)}&type=creator&tab=creators`}
                                  className="text-text-primary hover:text-accent hover:underline transition-colors"
                                >
                                  {part.name}
                                </Link>
                                {part.role && <span className="text-text-secondary"> ({part.role})</span>}
                                {idx < parts.length - 1 && <span className="text-text-tertiary">, </span>}
                              </span>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                    {comic.characters && (
                      <div>
                        <h3 className="text-sm font-medium text-text-secondary mb-2">
                          Персонажи
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {comic.characters.split(',').map((character, idx) => {
                            const trimmed = character.trim()
                            if (!trimmed) return null
                            
                            // Парсим формат "Имя (роль)" или просто "Имя"
                            const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/)
                            const name = match ? match[1].trim() : trimmed
                            
                            return (
                              <Link
                                key={idx}
                                href={`/search?q=${encodeURIComponent(name)}&type=character&tab=characters`}
                                className="text-sm text-text-primary hover:text-accent hover:underline transition-colors"
                              >
                                {name}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {comic.teams && (
                      <div>
                        <h3 className="text-sm font-medium text-text-secondary mb-2">
                          Команды
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {comic.teams.split(',').map((team, idx) => {
                            const trimmed = team.trim()
                            if (!trimmed) return null
                            
                            // Парсим формат "Имя (роль)" или просто "Имя"
                            const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/)
                            const name = match ? match[1].trim() : trimmed
                            
                            return (
                              <Link
                                key={idx}
                                href={`/search?q=${encodeURIComponent(name)}&type=team&tab=teams`}
                                className="text-sm text-text-primary hover:text-accent hover:underline transition-colors"
                              >
                                {name}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    </div>

                    {/* Мобильная версия - с аккордеонами */}
                    <div className="md:hidden">
                    {comic.creators && (
                      <Accordion title="Создатели" defaultOpen={true}>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            // Парсим строку с учетом скобок и запятых внутри них
                            const parts: Array<{ name: string; role: string | null }> = []
                            let current = ''
                            let inParens = false
                            let parensContent = ''

                            for (let i = 0; i < comic.creators.length; i++) {
                              const char = comic.creators[i]

                              if (char === '(') {
                                inParens = true
                                parensContent = ''
                              } else if (char === ')') {
                                inParens = false
                              } else if (char === ',' && !inParens) {
                                const trimmed = current.trim()
                                if (trimmed) {
                                  parts.push({
                                    name: trimmed,
                                    role: parensContent ? parensContent.trim() : null,
                                  })
                                }
                                current = ''
                                parensContent = ''
                              } else {
                                if (inParens) {
                                  parensContent += char
                                } else {
                                  if (char === ' ' && current.endsWith(' ')) {
                                    continue
                                  }
                                  current += char
                                }
                              }
                            }

                            const trimmed = current.trim()
                            if (trimmed) {
                              parts.push({
                                name: trimmed,
                                role: parensContent ? parensContent.trim() : null,
                              })
                            }

                            return parts.map((part, idx) => (
                              <span key={idx} className="text-sm text-text-primary">
                                <Link
                                  href={`/search?q=${encodeURIComponent(part.name)}&type=creator&tab=creators`}
                                  className="text-text-primary hover:text-accent hover:underline transition-colors"
                                >
                                  {part.name}
                                </Link>
                                {part.role && <span className="text-text-secondary"> ({part.role})</span>}
                                {idx < parts.length - 1 && <span className="text-text-tertiary">, </span>}
                              </span>
                            ))
                          })()}
                        </div>
                      </Accordion>
                    )}
                    {comic.characters && (
                      <Accordion title="Персонажи" defaultOpen={false}>
                        <div className="flex flex-wrap gap-2">
                          {comic.characters.split(',').map((character, idx) => {
                            const trimmed = character.trim()
                            if (!trimmed) return null

                            const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/)
                            const name = match ? match[1].trim() : trimmed

                            return (
                              <Link
                                key={idx}
                                href={`/search?q=${encodeURIComponent(name)}&type=character&tab=characters`}
                                className="text-sm text-text-primary hover:text-accent hover:underline transition-colors"
                              >
                                {name}
                              </Link>
                            )
                          })}
                        </div>
                      </Accordion>
                    )}
                    {comic.teams && (
                      <Accordion title="Команды" defaultOpen={false}>
                        <div className="flex flex-wrap gap-2">
                          {comic.teams.split(',').map((team, idx) => {
                            const trimmed = team.trim()
                            if (!trimmed) return null

                            const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/)
                            const name = match ? match[1].trim() : trimmed

                            return (
                              <Link
                                key={idx}
                                href={`/search?q=${encodeURIComponent(name)}&type=team&tab=teams`}
                                className="text-sm text-text-primary hover:text-accent hover:underline transition-colors"
                              >
                                {name}
                              </Link>
                            )
                          })}
                        </div>
                      </Accordion>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* FAB для мобильной навигации */}
      <ComicNavigationFAB
        publisherId={comic.series.publisher.id}
        seriesId={comic.series.id}
        prevIssue={comic.prevIssue}
        nextIssue={comic.nextIssue}
      />

      <Footer />

      {/* BottomSheet для информации о переводе */}
      <TranslationBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={handleCloseBottomSheet}
        translation={selectedTranslation}
      />
    </div>
  )
}

