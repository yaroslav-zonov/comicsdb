import { Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SearchResultsView from '@/components/SearchResultsView'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { decodeHtmlEntities, encodeHtmlEntities, getImageUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  page?: string
  tab?: string
  type?: string // 'creator', 'character', 'team', 'scanlator' для автоматического выбора таба
  sort?: string // 'relevance', 'name_asc', 'name_desc', 'date_asc', 'date_desc', 'translation_date_asc', 'translation_date_desc'
}

// Получаем ID комиксов с глобальными событиями
async function getGlobalComicIds(): Promise<Set<string>> {
  try {
    const globalComics = await prisma.$queryRaw<Array<{ comics: string }>>`
      SELECT DISTINCT comics FROM cdb_globcom WHERE date_delete IS NULL
    `
    return new Set(globalComics.map(g => g.comics))
  } catch (error) {
    console.error('Error getting global comic IDs:', error)
    return new Set()
  }
}

// Тип для результатов поиска комиксов из $queryRaw
type ComicSearchResult = {
      id: number
      comicvine: number
      number: number
      serie: number
      thumb: string | null
      tiny: string | null
      site: string
      site2: string
      translate: string
      edit: string
      date: Date | null
      pdate: Date
      link: string
      adddate: Date
}

// Вспомогательная функция для обработки результатов поиска комиксов
async function processComicSearchResults(
  exactComics: ComicSearchResult[],
  total: number,
  page: number,
  pageSize: number,
  sort: string,
  globalComicIds: Set<string>
) {
    if (total === 0) {
      return {
        results: [],
        total: 0,
        page,
        pageSize,
      suggestions: [],
      }
    }

  // Конвертируем BigInt в Number, так как MySQL возвращает BigInt, а Prisma ожидает Int
  const comicIds = exactComics.map(c => Number(c.id))
    const comics = await prisma.comic.findMany({
      where: {
        id: { in: comicIds },
        dateDelete: null,
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
      },
    })

    // Сортируем вручную
    comics.sort((a, b) => {
    if (sort === 'name_asc') return (a.series?.name || '').localeCompare(b.series?.name || '')
    if (sort === 'name_desc') return (b.series?.name || '').localeCompare(a.series?.name || '')
      if (sort === 'date_asc') return (a.pdate?.getTime() || 0) - (b.pdate?.getTime() || 0)
      if (sort === 'date_desc') return (b.pdate?.getTime() || 0) - (a.pdate?.getTime() || 0)
      if (sort === 'translation_date_asc') return (a.date?.getTime() || 0) - (b.date?.getTime() || 0)
      if (sort === 'translation_date_desc') return (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
      return (b.adddate?.getTime() || 0) - (a.adddate?.getTime() || 0)
    })

    // Получаем названия сайтов
    const comicSiteIds = [...new Set(comics.flatMap(c => [c.site, c.site2].filter(Boolean)))]
    const sites = comicSiteIds.length > 0 ? await prisma.site.findMany({
      where: {
        id: { in: comicSiteIds },
        dateDelete: null,
      },
      select: {
        id: true,
        name: true,
      },
    }) : []
    const siteMap = new Map(sites.map(s => [s.id, s.name]))

    return {
      results: comics.map((comic) => {
        const site1 = siteMap.get(comic.site)
        const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)
        
        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
        series: comic.series ? {
            id: comic.series.id,
            name: decodeHtmlEntities(comic.series.name),
            publisher: {
              id: comic.series.publisher.id,
              name: decodeHtmlEntities(comic.series.publisher.name),
            },
        } : {
          id: 0,
          name: 'Неизвестная серия',
          publisher: {
            id: 0,
            name: 'Неизвестное издательство',
            },
          },
          thumb,
          tiny,
          siteName: site1 ? decodeHtmlEntities(site1) : comic.site,
          siteId: comic.site,
          site2Name: site2 ? decodeHtmlEntities(site2) : null,
          site2Id: site2 ? comic.site2 : null,
          translate: decodeHtmlEntities(comic.translate),
          edit: decodeHtmlEntities(comic.edit),
          date: comic.date,
          pdate: comic.pdate,
          link: comic.link,
          hasGlobalEvent: globalComicIds.has(String(comic.id)),
          isJoint: !!site2,
        }
      }),
      total,
      page,
      pageSize,
    suggestions: [],
  }
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
    // Релевантность = точность совпадения (точное = выше) + позиция совпадения (раньше = выше)
    if (sort === 'relevance') {
      const [seriesRaw, total] = await Promise.all([
        prisma.$queryRaw<Array<{
      id: number
          name: string
          volume: string
          publisher: number
          thumb: string
          status: string
      comicvine: number
          total: number
          relevance: number
        }>>`
          SELECT 
            s.id,
            s.name,
            s.volume,
            s.publisher,
            s.thumb,
            s.status,
            s.comicvine,
            s.total,
            (
              CASE 
                WHEN LOWER(s.name) = LOWER(${trimmedQuery}) THEN 1000
                WHEN LOWER(s.name) LIKE LOWER(${`${trimmedQuery}%`}) THEN 500
                WHEN LOWER(s.name) LIKE LOWER(${`% ${trimmedQuery}%`}) THEN 300
                ELSE 100
              END - LOCATE(LOWER(${trimmedQuery}), LOWER(s.name)) + 1
            ) as relevance
          FROM cdb_series s
          WHERE s.date_delete IS NULL
            AND LOWER(s.name) LIKE LOWER(${`%${trimmedQuery}%`})
          ORDER BY relevance DESC, s.name ASC
      LIMIT ${pageSize}
      OFFSET ${skip}
        `,
        prisma.series.count({
          where: {
            dateDelete: null,
            name: {
              contains: trimmedQuery,
            },
          },
        }),
      ])

      // Получаем полную информацию о сериях
      const seriesIds = seriesRaw.map(s => s.id)
      const seriesFull = await prisma.series.findMany({
        where: {
          id: { in: seriesIds },
          dateDelete: null,
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
      })

      // Сохраняем порядок из SQL запроса
      const seriesMap = new Map(seriesFull.map(s => [s.id, s]))
      const series = seriesIds.map(id => seriesMap.get(id)!).filter(Boolean)

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
 * Поиск комиксов по персонажам - точное совпадение
 */
async function searchByCharacters(query: string, page: number = 1, sort: string = 'adddate_desc') {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
    }

    const pageSize = 100
    const skip = (page - 1) * pageSize
    const globalComicIds = await getGlobalComicIds()

    // Ищем точное совпадение в поле characters
    // Важно: на странице комикса данные декодируются, но в базе могут быть закодированы
    const encodedQuery = encodeHtmlEntities(trimmedQuery)
    
    const exactComics = await prisma.$queryRaw<Array<ComicSearchResult>>`
      SELECT DISTINCT c.id, c.comicvine, c.number, c.serie, c.thumb, c.tiny, c.site, c.site2,
             c.translate, c.edit, c.date, c.pdate, c.link, c.adddate
      FROM cdb_comics c
      WHERE c.date_delete IS NULL
        AND c.characters IS NOT NULL
        AND c.characters != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(c.characters, ', ', ',')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(c.characters, ', ', ',')) > 0
        )
      ORDER BY ${Prisma.raw(sort === 'name_asc' ? 'c.serie ASC' : sort === 'name_desc' ? 'c.serie DESC' : sort === 'date_asc' ? 'c.pdate ASC' : sort === 'date_desc' ? 'c.pdate DESC' : sort === 'translation_date_asc' ? 'c.date ASC' : sort === 'translation_date_desc' ? 'c.date DESC' : 'c.adddate DESC')}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT c.id) as count
      FROM cdb_comics c
      WHERE c.date_delete IS NULL
        AND c.characters IS NOT NULL
        AND c.characters != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(c.characters, ', ', ',')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(c.characters, ', ', ',')) > 0
        )
    `
    const total = Number(totalResult[0]?.count || 0)

    return await processComicSearchResults(exactComics, total, page, pageSize, sort, globalComicIds)
  } catch (error) {
    console.error('Error searching by characters:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Поиск комиксов по авторам - точное совпадение
 */
async function searchByCreators(query: string, page: number = 1, sort: string = 'adddate_desc') {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
    }

    const pageSize = 100
    const skip = (page - 1) * pageSize
    const globalComicIds = await getGlobalComicIds()

    // Ищем точное совпадение в поле creators
    // Обрабатываем формат с ролями: "Name (role)"
    // Важно: на странице комикса данные декодируются, но в базе могут быть закодированы
    // Поэтому ищем и по декодированному запросу, и по закодированному
    const encodedQuery = trimmedQuery.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/&/g, '&amp;')
    
    const exactComics = await prisma.$queryRaw<Array<ComicSearchResult>>`
      SELECT DISTINCT c.id, c.comicvine, c.number, c.serie, c.thumb, c.tiny, c.site, c.site2,
             c.translate, c.edit, c.date, c.pdate, c.link, c.adddate
        FROM cdb_comics c
        WHERE c.date_delete IS NULL
        AND c.creators IS NOT NULL
        AND c.creators != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(REPLACE(REPLACE(c.creators, ', ', ','), ' (', ','), ')', '')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(REPLACE(REPLACE(c.creators, ', ', ','), ' (', ','), ')', '')) > 0
          OR c.creators LIKE ${`${trimmedQuery} (%`}
          OR c.creators LIKE ${`%, ${trimmedQuery} (%`}
          OR c.creators LIKE ${`${encodedQuery} (%`}
          OR c.creators LIKE ${`%, ${encodedQuery} (%`}
        )
      ORDER BY ${Prisma.raw(sort === 'name_asc' ? 'c.serie ASC' : sort === 'name_desc' ? 'c.serie DESC' : sort === 'date_asc' ? 'c.pdate ASC' : sort === 'date_desc' ? 'c.pdate DESC' : sort === 'translation_date_asc' ? 'c.date ASC' : sort === 'translation_date_desc' ? 'c.date DESC' : 'c.adddate DESC')}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT c.id) as count
      FROM cdb_comics c
      WHERE c.date_delete IS NULL
        AND c.creators IS NOT NULL
        AND c.creators != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(REPLACE(REPLACE(c.creators, ', ', ','), ' (', ','), ')', '')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(REPLACE(REPLACE(c.creators, ', ', ','), ' (', ','), ')', '')) > 0
          OR c.creators LIKE ${`${trimmedQuery} (%`}
          OR c.creators LIKE ${`%, ${trimmedQuery} (%`}
          OR c.creators LIKE ${`${encodedQuery} (%`}
          OR c.creators LIKE ${`%, ${encodedQuery} (%`}
        )
    `
    const total = Number(totalResult[0]?.count || 0)

    return await processComicSearchResults(exactComics, total, page, pageSize, sort, globalComicIds)
  } catch (error) {
    console.error('Error searching by creators:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Поиск комиксов по командам - точное совпадение
 */
async function searchByTeams(query: string, page: number = 1, sort: string = 'adddate_desc') {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
    }

    const pageSize = 100
    const skip = (page - 1) * pageSize
    const globalComicIds = await getGlobalComicIds()

    // Ищем точное совпадение в поле teams
    // Важно: на странице комикса данные декодируются, но в базе могут быть закодированы
    const encodedQuery = trimmedQuery.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/&/g, '&amp;')
    
    const exactComics = await prisma.$queryRaw<Array<ComicSearchResult>>`
      SELECT DISTINCT c.id, c.comicvine, c.number, c.serie, c.thumb, c.tiny, c.site, c.site2,
             c.translate, c.edit, c.date, c.pdate, c.link, c.adddate
      FROM cdb_comics c
      WHERE c.date_delete IS NULL
        AND c.teams IS NOT NULL
        AND c.teams != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(c.teams, ', ', ',')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(c.teams, ', ', ',')) > 0
        )
      ORDER BY ${Prisma.raw(sort === 'name_asc' ? 'c.serie ASC' : sort === 'name_desc' ? 'c.serie DESC' : sort === 'date_asc' ? 'c.pdate ASC' : sort === 'date_desc' ? 'c.pdate DESC' : sort === 'translation_date_asc' ? 'c.date ASC' : sort === 'translation_date_desc' ? 'c.date DESC' : 'c.adddate DESC')}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT c.id) as count
      FROM cdb_comics c
      WHERE c.date_delete IS NULL
        AND c.teams IS NOT NULL
        AND c.teams != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(c.teams, ', ', ',')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(c.teams, ', ', ',')) > 0
        )
    `
    const total = Number(totalResult[0]?.count || 0)

    return await processComicSearchResults(exactComics, total, page, pageSize, sort, globalComicIds)
  } catch (error) {
    console.error('Error searching by teams:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Поиск комиксов по сканлейтерам - точное совпадение
 * Новая реализация без raw SQL для надёжности
 */
async function searchByScanlators(query: string, page: number = 1, sort: string = 'adddate_desc') {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
    }

    const pageSize = 100
    const skip = (page - 1) * pageSize
    const globalComicIds = await getGlobalComicIds()

    // Используем raw SQL для обработки невалидных дат
    const allComics = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: number
      seriesId: number
      seriesName: string
      publisherId: number
      publisherName: string
      thumb: string | null
      tiny: string | null
      site: string
      site2: string | null
      translate: string | null
      edit: string | null
      link: string | null
      date: Date | null
      pdate: Date | null
      adddate: Date | null
    }>>`
      SELECT
        c.id, c.comicvine, c.number,
        s.id as seriesId, s.name as seriesName,
        p.id as publisherId, p.name as publisherName,
        c.thumb, c.tiny, c.site, c.site2, c.translate, c.edit, c.link,
        CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 OR MONTH(c.date) = 0 OR DAY(c.date) = 0 THEN NULL ELSE c.date END as date,
        CASE WHEN c.pdate = '0000-00-00' OR YEAR(c.pdate) = 0 OR MONTH(c.pdate) = 0 OR DAY(c.pdate) = 0 THEN NULL ELSE c.pdate END as pdate,
        CASE WHEN c.adddate = '0000-00-00' OR YEAR(c.adddate) = 0 OR MONTH(c.adddate) = 0 OR DAY(c.adddate) = 0 THEN NULL ELSE c.adddate END as adddate
      FROM comic c
      INNER JOIN series s ON c.series = s.id
      INNER JOIN publisher p ON s.publisher = p.id
      WHERE c.dateDelete IS NULL
        AND (c.translate LIKE ${`%${trimmedQuery}%`} OR c.edit LIKE ${`%${trimmedQuery}%`})
    `

    // Фильтруем точно по имени (case-insensitive)
    const lowerQuery = trimmedQuery.toLowerCase()
    const matchScanlator = (field: string | null): boolean => {
      if (!field) return false
      const names = field.split(',').map(s => s.trim())
      return names.some(name => name.toLowerCase() === lowerQuery)
    }

    const comicsWithDates = allComics.filter(c =>
      matchScanlator(c.translate) || matchScanlator(c.edit)
    )

    const total = comicsWithDates.length

    if (total === 0) {
      return {
        results: [],
        total: 0,
        page,
        pageSize,
        suggestions: [],
      }
    }

    // Определяем реальный ник сканлейтера
    const getRealScanlatorName = (comic: typeof comicsWithDates[0]): string | null => {
      const translateList = (comic.translate || '').split(',').map(s => s.trim())
      const editList = (comic.edit || '').split(',').map(s => s.trim())
      const inTranslate = translateList.find(s => s.toLowerCase() === lowerQuery)
      const inEdit = editList.find(s => s.toLowerCase() === lowerQuery)
      return inTranslate || inEdit || null
    }

    // Сортируем комиксы
    comicsWithDates.sort((a, b) => {
      if (sort === 'name_asc') {
        const nameA = a.seriesName || ''
        const nameB = b.seriesName || ''
        return nameA.localeCompare(nameB)
      }
      if (sort === 'name_desc') {
        const nameA = a.seriesName || ''
        const nameB = b.seriesName || ''
        return nameB.localeCompare(nameA)
      }
      if (sort === 'date_asc') return (a.pdate?.getTime() || 0) - (b.pdate?.getTime() || 0)
      if (sort === 'date_desc') return (b.pdate?.getTime() || 0) - (a.pdate?.getTime() || 0)
      if (sort === 'translation_date_asc') return (a.date?.getTime() || 0) - (b.date?.getTime() || 0)
      if (sort === 'translation_date_desc') return (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
      return (b.adddate?.getTime() || 0) - (a.adddate?.getTime() || 0)
    })

    // Применяем пагинацию
    const paginatedComics = comicsWithDates.slice(skip, skip + pageSize)

    // Получаем сайты для отображения
    const siteIds = [...new Set(paginatedComics.flatMap(c => [c.site, c.site2].filter((x): x is string => Boolean(x))))]
    const sites = siteIds.length > 0 ? await prisma.site.findMany({
      where: {
        id: { in: siteIds },
        dateDelete: null,
      },
      select: {
        id: true,
        name: true,
      },
    }) : []
    const siteMap = new Map(sites.map(s => [s.id, s.name]))

    return {
      results: paginatedComics.map((comic) => {
        const realName = getRealScanlatorName(comic)
        const site1 = siteMap.get(comic.site)
        const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)

        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
          series: {
            id: comic.seriesId,
            name: decodeHtmlEntities(comic.seriesName),
            publisher: {
              id: comic.publisherId,
              name: decodeHtmlEntities(comic.publisherName),
            },
          },
          thumb,
          tiny,
          siteName: site1 ? decodeHtmlEntities(site1) : comic.site,
          siteId: comic.site,
          site2Name: site2 ? decodeHtmlEntities(site2) : null,
          site2Id: site2 ? comic.site2 : null,
          translate: realName || decodeHtmlEntities(comic.translate || ''),
          edit: realName || decodeHtmlEntities(comic.edit || ''),
          date: comic.date,
          pdate: comic.pdate,
          link: comic.link,
          hasGlobalEvent: globalComicIds.has(String(comic.id)),
          isJoint: !!site2,
        }
      }),
      total,
      page,
      pageSize,
      suggestions: [],
    }
  } catch (error) {
    console.error('Error searching by scanlators:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Получение статистики сканлейтера
 * Новая реализация без raw SQL - использует ту же логику, что и searchByScanlators
 */
async function getScanlatorStats(name: string) {
  try {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return null
    }

    const lowerQuery = trimmedName.toLowerCase()

    // Используем raw SQL для обработки невалидных дат
    const allComics = await prisma.$queryRaw<Array<{
      id: number
      translate: string | null
      edit: string | null
      pdate: Date | null
    }>>`
      SELECT
        id, translate, edit,
        CASE WHEN pdate = '0000-00-00' OR YEAR(pdate) = 0 OR MONTH(pdate) = 0 OR DAY(pdate) = 0 THEN NULL ELSE pdate END as pdate
      FROM comic
      WHERE dateDelete IS NULL
        AND (translate LIKE ${`%${trimmedName}%`} OR edit LIKE ${`%${trimmedName}%`})
    `

    // Фильтруем точно по имени (case-insensitive)
    const matchScanlator = (field: string | null): boolean => {
      if (!field) return false
      const names = field.split(',').map(s => s.trim())
      return names.some(name => name.toLowerCase() === lowerQuery)
    }

    const comics = allComics
      .filter(c => matchScanlator(c.translate) || matchScanlator(c.edit))
      .sort((a, b) => (a.pdate?.getTime() || 0) - (b.pdate?.getTime() || 0))

    if (comics.length === 0) {
      return null
    }

    // Находим реальное имя сканлейтера из базы (первое вхождение)
    let realName = trimmedName
    for (const comic of comics) {
      if (comic.translate) {
        const translateList = comic.translate.split(',').map(s => s.trim())
        const found = translateList.find(s => s.toLowerCase() === lowerQuery)
        if (found) {
          realName = found
          break
        }
      }
      if (comic.edit) {
        const editList = comic.edit.split(',').map(s => s.trim())
        const found = editList.find(s => s.toLowerCase() === lowerQuery)
        if (found) {
          realName = found
          break
        }
      }
    }

    // Подсчет переводов и оформлений
    const normalizeForMatch = (name: string, query: string): boolean => {
      return name.toLowerCase().trim() === query.toLowerCase().trim()
    }

    const translatedCount = comics.filter(c => {
      if (!c.translate) return false
      const translateList = c.translate.split(',').map(s => s.trim())
      return translateList.some(s => normalizeForMatch(s, trimmedName))
    }).length

    const editedCount = comics.filter(c => {
      if (!c.edit) return false
      const editList = c.edit.split(',').map(s => s.trim())
      return editList.some(s => normalizeForMatch(s, trimmedName))
    }).length

    // Вычисляем статистику по датам перевода (pdate)
    const validComics = comics.filter(c => c.pdate)

    // Базовая статистика всегда должна возвращаться
    const stats: any = {
      total: comics.length,
      realName,
      translatedCount,
      editedCount,
    }

    // Добавляем даты только если они есть
    if (validComics.length > 0) {
      const firstRelease = validComics[0].pdate
      const lastRelease = validComics[validComics.length - 1].pdate

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
    searchByCharacters(query, page, sort),
    searchByCreators(query, page, sort),
    searchByScanlators(query, page, sort),
    searchByTeams(query, page, sort),
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
  const query = resolvedParams.q || ''

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
