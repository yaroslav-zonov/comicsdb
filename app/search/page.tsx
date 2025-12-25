import { Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SearchResultsView from '@/components/SearchResultsView'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, getImageUrl } from '@/lib/utils'
import { searchComicsByField, searchByScanlators } from '@/lib/search-queries'

export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  page?: string
  tab?: string
  type?: string // 'creator', 'character', 'team', 'scanlator' для автоматического выбора таба
  sort?: string // 'relevance', 'name_asc', 'name_desc', 'date_asc', 'date_desc', 'translation_date_asc', 'translation_date_desc'
}

/**
 * Поиск по сериям - частичный поиск по одному слову
 */
async function searchSeries(query: string, page: number = 1, sort: string = 'relevance') {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
    }

    const pageSize = 100
    const skip = (page - 1) * pageSize

    // Для сортировки по релевантности используем SQL с вычислением релевантности
    if (sort === 'relevance') {
      const results = await prisma.$queryRaw<Array<{
        id: number
        name: string
        volume: string
        publisher_id: number
        publisher_name: string
        thumb: string | null
        first_comic_thumb: string | null
        first_comic_tiny: string | null
        status: string
        comicvine: number
        total: number
        comics_count: bigint
        relevance: number
        total_count: bigint
      }>>`
        SELECT
          s.id,
          s.name,
          s.volume,
          p.id as publisher_id,
          p.name as publisher_name,
          s.thumb,
          (SELECT c.thumb FROM cdb_comics c
           WHERE c.serie = s.id AND c.date_delete IS NULL
           ORDER BY c.number ASC LIMIT 1) as first_comic_thumb,
          (SELECT c.tiny FROM cdb_comics c
           WHERE c.serie = s.id AND c.date_delete IS NULL
           ORDER BY c.number ASC LIMIT 1) as first_comic_tiny,
          s.status,
          s.comicvine,
          s.total,
          (SELECT COUNT(*) FROM cdb_comics c
           WHERE c.serie = s.id AND c.date_delete IS NULL) as comics_count,
          (
            CASE
              WHEN LOWER(s.name) = LOWER(${trimmedQuery}) THEN 1000
              WHEN LOWER(s.name) LIKE LOWER(${`${trimmedQuery}%`}) THEN 500
              WHEN LOWER(s.name) LIKE LOWER(${`% ${trimmedQuery}%`}) THEN 300
              ELSE 100
            END - LOCATE(LOWER(${trimmedQuery}), LOWER(s.name)) + 1
          ) as relevance,
          COUNT(*) OVER() as total_count
        FROM cdb_series s
        INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
        WHERE s.date_delete IS NULL
          AND LOWER(s.name) LIKE LOWER(${`%${trimmedQuery}%`})
        ORDER BY relevance DESC, s.name ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `

      const total = results.length > 0 ? Number(results[0].total_count) : 0

      return {
        results: results.map(s => ({
          id: s.id,
          name: decodeHtmlEntities(s.name),
          volume: s.volume,
          publisher: {
            id: s.publisher_id,
            name: decodeHtmlEntities(s.publisher_name),
          },
          thumb: s.first_comic_thumb
            ? getImageUrl(s.first_comic_thumb) || getImageUrl(s.first_comic_tiny)
            : getImageUrl(s.thumb),
          comicsCount: Number(s.comics_count),
          status: s.status,
          comicvine: s.comicvine,
          total: s.total,
        })),
        total,
        page,
        pageSize,
        suggestions: [],
      }
    }

    // Для остальных типов сортировки используем стандартный Prisma запрос
    let orderBy: any = { name: 'asc' }
    if (sort === 'name_desc') {
      orderBy = { name: 'desc' }
    }

    const [series, total] = await Promise.all([
      prisma.series.findMany({
        where: {
          dateDelete: null,
          name: {
            contains: trimmedQuery,
          },
        },
        include: {
          publisher: true,
          comics: {
            where: {
              dateDelete: null,
            },
            orderBy: {
              number: 'asc',
            },
            take: 1,
            select: {
              thumb: true,
              tiny: true,
            },
          },
          _count: {
            select: {
              comics: {
                where: {
                  dateDelete: null,
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.series.count({
        where: {
          dateDelete: null,
          name: {
            contains: trimmedQuery,
          },
        },
      }),
    ])

    return {
      results: series.map(s => ({
        id: s.id,
        name: decodeHtmlEntities(s.name),
        volume: s.volume,
        publisher: {
          id: s.publisher.id,
          name: decodeHtmlEntities(s.publisher.name),
        },
        thumb: s.comics.length > 0
          ? getImageUrl(s.comics[0].thumb) || getImageUrl(s.comics[0].tiny)
          : getImageUrl(s.thumb),
        comicsCount: s._count.comics,
        status: s.status,
        comicvine: s.comicvine,
        total: s.total,
      })),
      total,
      page,
      pageSize,
      suggestions: [],
    }
  } catch (error) {
    console.error('Error searching series:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Получение статистики сканлейтера
 * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует ту же SQL логику, что и searchByScanlators
 */
async function getScanlatorStats(name: string) {
  try {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return null
    }

    const lowerQuery = trimmedName.toLowerCase()

    // Используем тот же SQL запрос, что и в поиске, с JOIN для фильтрации удаленных series/publishers
    // ВАЖНО: используем c.date (дата перевода), а не c.pdate (дата публикации оригинала)
    const allComics = await prisma.$queryRaw<Array<{
      id: number
      translate: string | null
      edit: string | null
      date: Date | null
    }>>`
      SELECT
        c.id,
        c.translate,
        c.edit,
        CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 OR MONTH(c.date) = 0 OR DAY(c.date) = 0 THEN NULL ELSE c.date END as date
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      WHERE c.date_delete IS NULL
        AND (
          LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery}, ',%')
          OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT(${lowerQuery}, ',%')
          OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery})
          OR LOWER(REPLACE(c.translate, ', ', ',')) = ${lowerQuery}
          OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery}, ',%')
          OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT(${lowerQuery}, ',%')
          OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery})
          OR LOWER(REPLACE(c.edit, ', ', ',')) = ${lowerQuery}
        )
      ORDER BY c.date ASC
    `

    if (allComics.length === 0) {
      return null
    }

    // Извлекаем реальное имя сканлейтера (с правильным регистром)
    const extractRealName = (field: string | null): string | null => {
      if (!field) return null
      const names = field.split(',').map(s => s.trim())
      return names.find(name => name.toLowerCase() === lowerQuery) || null
    }

    let realName = trimmedName
    for (const comic of allComics) {
      const found = extractRealName(comic.translate) || extractRealName(comic.edit)
      if (found) {
        realName = found
        break
      }
    }

    // Подсчет переводов и оформлений
    const translatedCount = allComics.filter(c => extractRealName(c.translate) !== null).length
    const editedCount = allComics.filter(c => extractRealName(c.edit) !== null).length

    // Вычисляем статистику по датам ПЕРЕВОДА (c.date), а не оригинальной публикации (c.pdate)
    const validComics = allComics.filter(c => c.date)

    // Базовая статистика
    const stats: any = {
      total: allComics.length,
      realName,
      translatedCount,
      editedCount,
    }

    // Добавляем даты только если они есть
    if (validComics.length > 0) {
      const firstRelease = validComics[0].date
      const lastRelease = validComics[validComics.length - 1].date

      if (firstRelease && lastRelease) {
        const daysInScanlating = Math.max(0, Math.floor((lastRelease.getTime() - firstRelease.getTime()) / (1000 * 60 * 60 * 24)))

        stats.firstRelease = firstRelease
        stats.lastRelease = lastRelease
        stats.daysInScanlating = daysInScanlating
      }
    }

    return stats
  } catch (error) {
    console.error('Error getting scanlator stats:', error)
    return null
  }
}

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams
}) {
  // В Next.js 14 searchParams может быть Promise
  const resolvedParams = await Promise.resolve(searchParams)
  const query = resolvedParams.q || ''
  const typeParam = resolvedParams.type
  const page = parseInt(resolvedParams.page || '1')

  // Определяем таб автоматически на основе параметра type
  let defaultTab = resolvedParams.tab || 'series'
  if (typeParam === 'creator') {
    defaultTab = 'creators'
  } else if (typeParam === 'character') {
    defaultTab = 'characters'
  } else if (typeParam === 'team') {
    defaultTab = 'teams'
  } else if (typeParam === 'scanlator') {
    defaultTab = 'scanlators'
  }

  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Введите запрос для поиска</p>
      </div>
    )
  }

  const sort = resolvedParams.sort || (defaultTab === 'series' ? 'relevance' : 'adddate_desc')

  // Загружаем все табы параллельно для быстрого переключения без задержек
  // Статистику сканлейтера загружаем всегда, если есть результаты по сканлейтерам
  const [
    seriesResult,
    charactersResult,
    creatorsResult,
    scanlatorsResult,
    teamsResult,
  ] = await Promise.all([
    searchSeries(query, page, sort),
    searchComicsByField('characters', query, page, sort),
    searchComicsByField('creators', query, page, sort),
    searchByScanlators(query, page, sort),
    searchComicsByField('teams', query, page, sort),
  ])
  
  // Загружаем статистику сканлейтера ВСЕГДА, когда есть запрос
  // Это гарантирует, что статистика показывается для всех сканлейтеров при переключении на таб
  const scanlatorStats = query.trim()
    ? await getScanlatorStats(query)
    : null

  // Используем уже загруженные total из результатов
  // Если total = 0, возможно результаты еще не загружены, но это нормально для отображения
  const seriesCount = seriesResult.total
  const charactersCount = charactersResult.total
  const creatorsCount = creatorsResult.total
  const scanlatorsCount = scanlatorsResult.total
  const teamsCount = teamsResult.total

  return (
    <SearchResultsView
      query={query}
      activeTab={defaultTab}
      series={seriesResult.results}
      seriesTotal={seriesCount}
      seriesPage={seriesResult.page}
      seriesPageSize={seriesResult.pageSize}
      characters={charactersResult.results}
      charactersTotal={charactersCount}
      charactersPage={charactersResult.page}
      charactersPageSize={charactersResult.pageSize}
      charactersSuggestions={charactersResult.suggestions}
      creators={creatorsResult.results}
      creatorsTotal={creatorsCount}
      creatorsPage={creatorsResult.page}
      creatorsPageSize={creatorsResult.pageSize}
      creatorsSuggestions={creatorsResult.suggestions}
      scanlators={scanlatorsResult.results}
      scanlatorsTotal={scanlatorsCount}
      scanlatorsPage={scanlatorsResult.page}
      scanlatorsPageSize={scanlatorsResult.pageSize}
      scanlatorStats={scanlatorStats}
      teams={teamsResult.results}
      teamsTotal={teamsCount}
      teamsPage={teamsResult.page}
      teamsPageSize={teamsResult.pageSize}
      teamsSuggestions={teamsResult.suggestions}
    />
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams
}) {
  // В Next.js 14 searchParams может быть Promise
  const resolvedParams = await Promise.resolve(searchParams)

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-spacing-sm">
        {/* Хлебные крошки */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2 text-text-secondary">
            <li>
              <Link href="/" className="hover:text-accent transition-colors">
                Главная
              </Link>
            </li>
            <li>/</li>
            <li className="text-text-primary">Поиск</li>
          </ol>
        </nav>

        {/* Результаты */}
        <Suspense fallback={
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-bg-tertiary border-t-accent mb-4"></div>
            <p className="text-text-secondary">Загрузка результатов поиска...</p>
          </div>
        }>
          <SearchResults searchParams={resolvedParams} />
        </Suspense>
      </div>
      </div>
      
      <Footer />
    </div>
  )
}
