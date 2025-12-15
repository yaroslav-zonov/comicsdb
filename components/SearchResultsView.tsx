'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Squares2X2Icon,
  Bars3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline'
import TableRow from './TableRow'
import ComicCard from './ComicCard'
import Pagination from './Pagination'
import SeriesCardSkeleton from './skeletons/SeriesCardSkeleton'
import ComicCardSkeleton from './skeletons/ComicCardSkeleton'
import { getComicUrl, getSeriesUrl, formatDate } from '@/lib/utils'

type Comic = {
  id: number
  comicvine: number
  number: number
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
  siteName: string | null
  siteId?: string | null
  site2Name?: string | null
  site2Id?: string | null
  translate?: string | null
  edit?: string | null
  date?: Date | null
  pdate?: Date | null
  link?: string | null
  hasGlobalEvent?: boolean
  isJoint?: boolean
}

type Series = {
  id: number
  name: string
  volume: string
  publisher: {
    id: number
    name: string
  }
  thumb: string | null
  comicsCount: number
  status?: string
  comicvine?: number
  total?: number
}

type ScanlatorStats = {
  total: number
  translatedCount: number
  editedCount: number
  daysInScanlating: number
  lastRelease: Date
  realName?: string
} | null

type ViewMode = 'cards' | 'table'
type TabType = 'series' | 'characters' | 'creators' | 'scanlators' | 'teams'

type SearchResultsViewProps = {
  query: string
  activeTab: string
  series: Series[]
  seriesTotal: number
  seriesPage: number
  seriesPageSize: number
  characters: Comic[]
  charactersTotal: number
  charactersPage: number
  charactersPageSize: number
  charactersSuggestions?: string[]
  creators: Comic[]
  creatorsTotal: number
  creatorsPage: number
  creatorsPageSize: number
  creatorsSuggestions?: string[]
  scanlators: Comic[]
  scanlatorsTotal: number
  scanlatorsPage: number
  scanlatorsPageSize: number
  scanlatorStats: ScanlatorStats
  teams: Comic[]
  teamsTotal: number
  teamsPage: number
  teamsPageSize: number
  teamsSuggestions?: string[]
}

export default function SearchResultsView({
  query,
  activeTab,
  series,
  seriesTotal,
  seriesPage,
  seriesPageSize,
  characters,
  charactersTotal,
  charactersPage,
  charactersPageSize,
  creators,
  creatorsTotal,
  creatorsPage,
  creatorsPageSize,
  scanlators,
  scanlatorsTotal,
  scanlatorsPage,
  scanlatorsPageSize,
  scanlatorStats,
  teams,
  teamsTotal,
  teamsPage,
  teamsPageSize,
  charactersSuggestions = [],
  creatorsSuggestions = [],
  teamsSuggestions = [],
}: SearchResultsViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Используем activeTab из пропсов напрямую, чтобы результаты показывались сразу
  const [currentTab, setCurrentTab] = useState<TabType>(activeTab as TabType || 'series')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  // Синхронизируем с activeTab из пропсов
  useEffect(() => {
    if (activeTab && ['series', 'characters', 'creators', 'scanlators', 'teams'].includes(activeTab)) {
      setCurrentTab(activeTab as TabType)
    }
  }, [activeTab])

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      params.set('page', '1')
      router.push(`/search?${params.toString()}`)
    })
  }

  const handleSortChange = (sortField: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      // Для релевантности не используем направление
      if (sortField === 'relevance') {
        params.set('sort', 'relevance')
      } else {
        const currentSort = searchParams.get('sort') || (currentTab === 'series' ? 'relevance' : 'adddate_desc')
        const currentDirection = currentSort.includes('_desc') ? 'desc' : 'asc'
        params.set('sort', `${sortField}_${currentDirection}`)
      }
      params.set('page', '1')
      router.push(`/search?${params.toString()}`)
    })
  }

  const handleDirectionToggle = () => {
    const currentSort = searchParams.get('sort') || (currentTab === 'series' ? 'relevance' : 'adddate_desc')
    // Для релевантности не меняем направление
    if (currentSort === 'relevance') {
      return
    }
    const currentField = currentSort.split('_')[0]
    const currentDirection = currentSort.includes('_desc') ? 'desc' : 'asc'
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('sort', `${currentField}_${newDirection}`)
      params.set('page', '1')
      router.push(`/search?${params.toString()}`)
    })
  }

  const currentSort = searchParams.get('sort') || (currentTab === 'series' ? 'relevance' : 'adddate_desc')
  // Для adddate используем translation_date, так как это дата перевода
  let sortField = currentSort.split('_')[0]
  if (sortField === 'adddate') {
    sortField = 'translation_date'
  }
  const sortDirection = currentSort.includes('_desc') ? 'desc' : 'asc'
  const isRelevanceSort = sortField === 'relevance'

  // Функция для создания ссылок на страницы пагинации
  const getPageLink = (type: TabType) => (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', query)
    params.set('page', pageNum.toString())
    params.set('tab', type)
    return `/search?${params.toString()}`
  }

  const renderSuggestions = (suggestions: string[], type: 'characters' | 'creators' | 'teams') => {
    if (suggestions.length === 0) return null

    const getSearchUrl = (suggestion: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('q', suggestion)
      params.set('tab', type)
      params.set('page', '1')
      return `/search?${params.toString()}`
    }

    return (
      <div className="mb-6 p-4 bg-accent-light border border-border-primary rounded-lg">
        <p className="text-sm text-text-secondary mb-2">
          Возможно вы искали:
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <Link
              key={idx}
              href={getSearchUrl(suggestion)}
              className="text-sm text-accent hover:text-accent-hover hover:underline"
            >
              {suggestion}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const renderComics = (comics: Comic[], variant: 'main' | 'character-creator-team' | 'scanlator' = 'main') => {
    if (isPending) {
      return (
        <div className="grid-cards">
          {Array.from({ length: 12 }).map((_, i) => (
            <ComicCardSkeleton key={i} />
          ))}
        </div>
      )
    }
    
    if (viewMode === 'cards') {
      return (
        <div className="grid-cards">
          {comics.map((comic) => (
            <ComicCard
              key={comic.id}
              data={{
                id: comic.id,
                comicvine: comic.comicvine,
                number: comic.number,
                series: comic.series,
                thumb: comic.thumb,
                tiny: comic.tiny,
                siteName: comic.siteName,
                date: comic.date,
                pdate: comic.pdate,
              }}
              showCover={true}
              showTitle={true}
              titleMode="full"
              showPublisher={variant === 'character-creator-team'}
              showSite={variant === 'scanlator'}
              showDate={false}
            />
          ))}
        </div>
      )
    } else {
      if (isPending) {
        return (
          <div className="overflow-hidden hidden md:block">
            <table className="min-w-full">
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-24 bg-bg-tertiary rounded animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-bg-tertiary rounded animate-pulse mb-2 w-3/4" />
                          <div className="h-3 bg-bg-tertiary rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      
      return (
        <div className="overflow-hidden hidden md:block">
          <table className="min-w-full">
            <tbody>
              {comics.map((comic) => (
                <TableRow
                  key={comic.id}
                  type="comic"
                  variant={variant}
                  data={{
                    id: comic.id,
                    comicvine: comic.comicvine,
                    number: comic.number,
                    series: comic.series,
                    thumb: comic.thumb,
                    tiny: comic.tiny,
                    siteName: comic.siteName,
                    siteId: comic.siteId ?? (comic as any).siteId,
                    site2Name: comic.site2Name,
                    site2Id: comic.site2Id,
                    date: comic.date,
                    pdate: comic.pdate,
                    link: comic.link,
                    translate: comic.translate,
                    edit: comic.edit,
                    hasGlobalEvent: comic.hasGlobalEvent,
                    isJoint: comic.isJoint,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }

  const renderSeries = () => {
    if (isPending) {
      return (
        <div className="grid-cards">
          {Array.from({ length: 12 }).map((_, i) => (
            <SeriesCardSkeleton key={i} />
          ))}
        </div>
      )
    }
    
    if (viewMode === 'cards') {
      return (
        <div className="grid-cards">
          {series.map((s) => (
            <Link
              key={s.id}
              href={getSeriesUrl(s.publisher.id, s.id)}
              className="overflow-hidden group"
            >
              <div className="relative aspect-[2/3] bg-bg-tertiary">
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
                    <span className="text-text-tertiary text-xs">Нет обложки</span>
                  </div>
                )}
              </div>
              <div className="pt-3">
                <h3 className="font-semibold text-sm text-text-primary mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                  {s.name}
                </h3>
                <p className="text-xs text-text-secondary">{s.publisher.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )
    } else {
      if (isPending) {
        return (
          <div className="overflow-hidden hidden md:block">
            <table className="min-w-full">
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-24 bg-bg-tertiary rounded animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-bg-tertiary rounded animate-pulse mb-2 w-3/4" />
                          <div className="h-3 bg-bg-tertiary rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      
      return (
        <div className="overflow-hidden hidden md:block">
          <table className="min-w-full">
            <tbody>
              {series.map((s) => (
                <TableRow
                  key={s.id}
                  type="series"
                  variant="search"
                  data={{
                    id: s.id,
                    name: s.name,
                    publisher: s.publisher,
                    thumb: s.thumb,
                    status: s.status,
                    comicsCount: s.comicsCount,
                    total: s.total,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }

  // Формируем сводку результатов
  const summaryParts: string[] = []
  if (seriesTotal > 0) summaryParts.push(`${seriesTotal} сери${seriesTotal === 1 ? 'ю' : seriesTotal < 5 ? 'и' : 'й'}`)
  if (charactersTotal > 0) summaryParts.push(`${charactersTotal} появлени${charactersTotal === 1 ? 'е' : charactersTotal < 5 ? 'я' : 'й'} персонажа`)
  if (creatorsTotal > 0) summaryParts.push(`${creatorsTotal} работ${creatorsTotal === 1 ? 'а' : creatorsTotal < 5 ? 'ы' : ''} автора`)
  if (scanlatorsTotal > 0) summaryParts.push(`${scanlatorsTotal} релиз${scanlatorsTotal === 1 ? '' : scanlatorsTotal < 5 ? 'а' : 'ов'}`)
  if (teamsTotal > 0) summaryParts.push(`${teamsTotal} появлени${teamsTotal === 1 ? 'е' : teamsTotal < 5 ? 'я' : 'й'} команды`)

  return (
    <div>
      {/* Заголовок с запросом */}
      <h1 className="text-3xl font-bold text-text-primary mb-6">
        Результаты поиска: <span className="text-accent">{query}</span>
      </h1>

      {/* Сводка результатов */}
      {summaryParts.length > 0 && (
        <div className="mb-4 text-sm text-text-secondary">
          Найдено: {summaryParts.join(', ')}
        </div>
      )}

      {/* Фильтры и табы */}
      <div className="mb-6">
        {/* Фильтры сортировки */}
        <div className="mb-4 flex items-center gap-4">
          <span className="text-sm text-text-secondary">Сортировка по:</span>
          {currentTab === 'series' ? (
            <>
              <select
                value={sortField}
                onChange={(e) => handleSortChange(e.target.value)}
                className="text-sm border border-border-secondary rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-accent bg-bg-input text-text-primary"
              >
                <option value="relevance">релевантности</option>
                <option value="name">алфавиту</option>
              </select>
              <button
                onClick={handleDirectionToggle}
                disabled={isRelevanceSort || isPending}
                className={`p-1 rounded transition-colors ${
                  isRelevanceSort || isPending
                    ? 'text-text-tertiary cursor-not-allowed'
                    : sortDirection === 'asc'
                    ? 'text-accent bg-accent-light'
                    : 'text-accent bg-accent-light'
                }`}
                title={isRelevanceSort ? 'Недоступно для сортировки по релевантности' : sortDirection === 'asc' ? 'По возрастанию (нажмите для убывания)' : 'По убыванию (нажмите для возрастания)'}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4" />
                )}
              </button>
            </>
          ) : (
            <>
              <select
                value={sortField}
                onChange={(e) => handleSortChange(e.target.value)}
                className="text-sm border border-border-secondary rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-accent bg-bg-input text-text-primary"
              >
                <option value="name">алфавиту</option>
                <option value="date">дате публикации</option>
                <option value="translation_date">дате перевода</option>
              </select>
              <button
                onClick={handleDirectionToggle}
                disabled={isPending}
                className={`p-1 rounded transition-colors ${
                  isPending
                    ? 'text-text-tertiary cursor-not-allowed'
                    : sortDirection === 'asc'
                    ? 'text-accent bg-accent-light'
                    : 'text-accent bg-accent-light'
                }`}
                title={sortDirection === 'asc' ? 'По возрастанию (нажмите для убывания)' : 'По убыванию (нажмите для возрастания)'}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Табы */}
        <div className="border-b border-border-primary">
          <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => handleTabChange('series')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              currentTab === 'series'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary dark:hover:border-border-secondary'
            }`}
          >
            По сериям ({seriesTotal})
          </button>
          <button
            onClick={() => handleTabChange('characters')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              currentTab === 'characters'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary dark:hover:border-border-secondary'
            }`}
          >
            Персонажам ({charactersTotal})
          </button>
          <button
            onClick={() => handleTabChange('teams')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              currentTab === 'teams'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary dark:hover:border-border-secondary'
            }`}
          >
            Командам ({teamsTotal})
          </button>
          <button
            onClick={() => handleTabChange('creators')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              currentTab === 'creators'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary dark:hover:border-border-secondary'
            }`}
          >
            Авторам ({creatorsTotal})
          </button>
          <button
            onClick={() => handleTabChange('scanlators')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              currentTab === 'scanlators'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary dark:hover:border-border-secondary'
            }`}
          >
            Сканлейтерам ({scanlatorsTotal})
          </button>
        </nav>
        </div>
      </div>

      {/* Статистика сканлейтера - показываем всегда, когда есть статистика */}
      {(() => {
        console.log('[SearchResultsView] Проверка статистики:', {
          currentTab,
          isScanlatorsTab: currentTab === 'scanlators',
          hasStats: !!scanlatorStats,
          statsData: scanlatorStats
        })
        return null
      })()}
      {currentTab === 'scanlators' && scanlatorStats && (() => {
        // Форматируем время в сканлейте (только годы)
        const formatTimeInScanlating = (days: number): string => {
          if (days < 365) {
            return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`
          } else {
            const years = Math.floor(days / 365)
            return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`
          }
        }

        const displayName = scanlatorStats.realName || query

        return (
          <div className="bg-bg-card rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">{displayName}</h3>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-text-primary">{scanlatorStats.total}</span>
                <span className="text-sm text-text-secondary mt-1">комиксов</span>
              </div>
              {scanlatorStats.translatedCount > 0 && (
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-text-primary">{scanlatorStats.translatedCount}</span>
                  <span className="text-sm text-text-secondary mt-1">перевёл</span>
                </div>
              )}
              {scanlatorStats.editedCount > 0 && (
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-text-primary">{scanlatorStats.editedCount}</span>
                  <span className="text-sm text-text-secondary mt-1">оформил</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-text-primary">{formatTimeInScanlating(scanlatorStats.daysInScanlating)}</span>
                <span className="text-sm text-text-secondary mt-1">в сканлейте</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-text-primary">
                  {formatDate(scanlatorStats.lastRelease)}
                </span>
                <span className="text-sm text-text-secondary mt-1">последний релиз</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Переключатель вида (для всех табов) */}
      <div className="mb-4 flex justify-end">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'cards'
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            title="Карточки"
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`hidden md:flex p-2 rounded transition-colors ${
              viewMode === 'table'
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            title="Таблица"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Контент */}
      {currentTab === 'series' && (
        <>
          {series.length === 0 && seriesTotal === 0 ? (
            <p className="text-text-secondary">Ничего не найдено</p>
          ) : series.length === 0 && seriesTotal > 0 ? (
            <div className="grid-cards">
              {Array.from({ length: 12 }).map((_, i) => (
                <SeriesCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? renderSeries() : (
                <div className="overflow-hidden hidden md:block">
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
              <Pagination
                total={seriesTotal}
                page={seriesPage}
                pageSize={seriesPageSize}
                getPageLink={getPageLink('series')}
              />
            </>
          )}
        </>
      )}

      {currentTab === 'characters' && (
        <>
          {characters.length === 0 && charactersTotal === 0 ? (
            <>
              {renderSuggestions(charactersSuggestions, 'characters')}
              {charactersSuggestions.length === 0 && (
                <p className="text-text-secondary">Результатов не найдено</p>
              )}
            </>
          ) : characters.length === 0 && charactersTotal > 0 ? (
            <div className="grid-cards">
              {Array.from({ length: 12 }).map((_, i) => (
                <ComicCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? renderComics(characters, 'character-creator-team') : (
                <div className="overflow-hidden hidden md:block">
                  <table className="min-w-full">
                    <tbody>
                      {characters.map((comic) => (
                        <TableRow
                          key={comic.id}
                          type="comic"
                          variant="character-creator-team"
                          data={comic}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                total={charactersTotal}
                page={charactersPage}
                pageSize={charactersPageSize}
                getPageLink={getPageLink('characters')}
              />
            </>
          )}
        </>
      )}

      {currentTab === 'creators' && (
        <>
          {creators.length === 0 && creatorsTotal === 0 ? (
            <>
              {renderSuggestions(creatorsSuggestions, 'creators')}
              {creatorsSuggestions.length === 0 && (
                <p className="text-text-secondary">Результатов не найдено</p>
              )}
            </>
          ) : creators.length === 0 && creatorsTotal > 0 ? (
            <div className="grid-cards">
              {Array.from({ length: 12 }).map((_, i) => (
                <ComicCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? renderComics(creators, 'character-creator-team') : (
                <div className="overflow-hidden hidden md:block">
                  <table className="min-w-full">
                    <tbody>
                      {creators.map((comic) => (
                        <TableRow
                          key={comic.id}
                          type="comic"
                          variant="character-creator-team"
                          data={comic}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                total={creatorsTotal}
                page={creatorsPage}
                pageSize={creatorsPageSize}
                getPageLink={getPageLink('creators')}
              />
            </>
          )}
        </>
      )}

      {currentTab === 'scanlators' && (
        <>
          {scanlators.length === 0 && scanlatorsTotal === 0 ? (
            <p className="text-text-secondary">Ничего не найдено</p>
          ) : scanlators.length === 0 && scanlatorsTotal > 0 ? (
            <div className="grid-cards">
              {Array.from({ length: 12 }).map((_, i) => (
                <ComicCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? renderComics(scanlators, 'scanlator') : (
                <div className="overflow-hidden hidden md:block">
                  <table className="min-w-full">
                    <tbody>
                      {scanlators.map((comic) => (
                        <TableRow
                          key={comic.id}
                          type="comic"
                          variant="scanlator"
                          data={comic}
                          scanlatorQuery={query}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                total={scanlatorsTotal}
                page={scanlatorsPage}
                pageSize={scanlatorsPageSize}
                getPageLink={getPageLink('scanlators')}
              />
            </>
          )}
        </>
      )}

      {currentTab === 'teams' && (
        <>
          {teams.length === 0 && teamsTotal === 0 ? (
            <>
              {renderSuggestions(teamsSuggestions, 'teams')}
              {teamsSuggestions.length === 0 && (
                <p className="text-text-secondary">Результатов не найдено</p>
              )}
            </>
          ) : teams.length === 0 && teamsTotal > 0 ? (
            <div className="grid-cards">
              {Array.from({ length: 12 }).map((_, i) => (
                <ComicCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? renderComics(teams, 'character-creator-team') : (
                <div className="overflow-hidden hidden md:block">
                  <table className="min-w-full">
                    <tbody>
                      {teams.map((comic) => (
                        <TableRow
                          key={comic.id}
                          type="comic"
                          variant="character-creator-team"
                          data={comic}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                total={teamsTotal}
                page={teamsPage}
                pageSize={teamsPageSize}
                getPageLink={getPageLink('teams')}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
