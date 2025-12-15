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
 */
async function searchByScanlators(query: string, page: number = 1, sort: string = 'adddate_desc') {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
    }

    console.log('[searchByScanlators] Начинаем поиск для:', trimmedQuery)

    const pageSize = 100
    const skip = (page - 1) * pageSize
    const globalComicIds = await getGlobalComicIds()

    // Ищем точное совпадение БЕЗ УЧЕТА РЕГИСТРА в полях translate или edit
    // Это позволяет находить все релизы сканлейтера независимо от регистра в базе
    // Используем CONCAT в SQL для формирования паттернов LIKE
    const lowerQuery = trimmedQuery.toLowerCase()
    
    const exactMatchComics = await prisma.$queryRaw<Array<{
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
    }>>(Prisma.sql`
      SELECT DISTINCT c.id, c.comicvine, c.number, c.serie, c.thumb, c.tiny, c.site, c.site2,
             c.translate, c.edit, c.date, c.pdate, c.link, c.adddate
      FROM cdb_comics c
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
      ORDER BY ${Prisma.raw(sort === 'name_asc' ? 'c.serie ASC' : sort === 'name_desc' ? 'c.serie DESC' : sort === 'date_asc' ? 'c.pdate ASC' : sort === 'date_desc' ? 'c.pdate DESC' : sort === 'translation_date_asc' ? 'c.date ASC' : sort === 'translation_date_desc' ? 'c.date DESC' : 'c.adddate DESC')}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `)

    const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(DISTINCT c.id) as count
      FROM cdb_comics c
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
    `)
    const total = Number(totalResult[0]?.count || 0)

    console.log('[searchByScanlators] Найдено комиксов (total):', total, 'На странице:', exactMatchComics.length)

    if (total === 0) {
      console.log('[searchByScanlators] Результатов нет для:', trimmedQuery)
      return {
        results: [],
        total: 0,
        page,
        pageSize,
        suggestions: [],
      }
    }

    // Получаем серии для комиксов
    const seriesIds = [...new Set(exactMatchComics.map(c => c.serie))]
    const series = seriesIds.length > 0 ? await prisma.series.findMany({
      where: {
        id: { in: seriesIds },
        dateDelete: null,
      },
      include: {
        publisher: true,
      },
    }) : []
    const seriesMap = new Map(series.map(s => [s.id, s]))

    // Получаем названия сайтов
    const comicSiteIds = [...new Set(exactMatchComics.flatMap(c => [c.site, c.site2].filter(Boolean)))]
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

    // Определяем реальный ник сканлейтера для каждого комикса
    // Ищем без учета регистра, так как поиск тоже без учета регистра
    const getRealScanlatorName = (comic: typeof exactMatchComics[0]): string | null => {
      const translateList = comic.translate.split(',').map(s => s.trim())
      const editList = comic.edit.split(',').map(s => s.trim())
      
      // Сначала ищем точное совпадение
      const inTranslate = translateList.find(s => s === trimmedQuery)
      const inEdit = editList.find(s => s === trimmedQuery)
      
      if (inTranslate || inEdit) {
        return inTranslate || inEdit || null
      }
      
      // Если точного нет, ищем без учета регистра
      const inTranslateLower = translateList.find(s => s.toLowerCase() === trimmedQuery.toLowerCase())
      const inEditLower = editList.find(s => s.toLowerCase() === trimmedQuery.toLowerCase())
      
      return inTranslateLower || inEditLower || null
    }

    // Сортируем комиксы вручную
    const comicsWithSeries = exactMatchComics.map(c => ({
      ...c,
      seriesData: seriesMap.get(c.serie),
    }))

    comicsWithSeries.sort((a, b) => {
      if (sort === 'name_asc') {
        const nameA = a.seriesData?.name || ''
        const nameB = b.seriesData?.name || ''
        return nameA.localeCompare(nameB)
      }
      if (sort === 'name_desc') {
        const nameA = a.seriesData?.name || ''
        const nameB = b.seriesData?.name || ''
        return nameB.localeCompare(nameA)
      }
      if (sort === 'date_asc') return (a.pdate?.getTime() || 0) - (b.pdate?.getTime() || 0)
      if (sort === 'date_desc') return (b.pdate?.getTime() || 0) - (a.pdate?.getTime() || 0)
      if (sort === 'translation_date_asc') return (a.date?.getTime() || 0) - (b.date?.getTime() || 0)
      if (sort === 'translation_date_desc') return (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
      return (b.adddate?.getTime() || 0) - (a.adddate?.getTime() || 0)
    })

    return {
      results: comicsWithSeries.map((comic) => {
        const seriesData = comic.seriesData
        const realName = getRealScanlatorName(comic)
        const site1 = siteMap.get(comic.site)
        const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)
        
        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
          series: seriesData ? {
            id: seriesData.id,
            name: decodeHtmlEntities(seriesData.name),
            publisher: {
              id: seriesData.publisher.id,
              name: decodeHtmlEntities(seriesData.publisher.name),
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
          translate: realName || decodeHtmlEntities(comic.translate),
          edit: realName || decodeHtmlEntities(comic.edit),
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
 */
async function getScanlatorStats(name: string) {
  try {
    const trimmedName = name.trim()
    if (!trimmedName) {
      console.log('[getScanlatorStats] Пустое имя, возвращаем null')
      return null
    }
    
    console.log('[getScanlatorStats] Начинаем поиск для:', trimmedName)
    
    // Используем ТОЧНО ТУ ЖЕ логику поиска, что и в searchByScanlators - БЕЗ УЧЕТА РЕГИСТРА
    // Это критически важно для правильного подсчета и соответствия результатов
    // Используем LOCATE для поиска без учета регистра, так как FIND_IN_SET не работает с LOWER
    // LOCATE ищет подстроку, но мы проверяем что она находится в начале или после запятой/пробела
    const lowerQuery = trimmedName.toLowerCase()
    console.log('[getScanlatorStats] Поиск с lowerQuery:', lowerQuery)
    
    // Используем CONCAT в SQL для формирования паттернов LIKE
    // Это позволяет правильно обрабатывать wildcards без экранирования
    // Используем точно такой же подход, как в searchByScanlators - Prisma.sql с CONCAT
    // Это должно работать одинаково для всех сканлейтеров
    let comics: Array<{
      id: number
      adddate: Date
      date: Date | null
      translate: string
      edit: string
    }> = []
    
    try {
      console.log('[getScanlatorStats] Используем searchByScanlators для получения данных...')
      // Используем searchByScanlators, который работает для всех сканлейтеров, включая KazikZ
      // Получаем данные порциями, так как прямой запрос без LIMIT падает для некоторых сканлейтеров
      const allComics: Array<{
        id: number
        adddate: Date
        date: Date | null
        translate: string
        edit: string
      }> = []
      
      let page = 1
      const pageSize = 1000
      let hasMore = true
      
      while (hasMore) {
        try {
          const result = await prisma.$queryRaw<Array<{
            id: number
            adddate: Date
            date: Date | null
            translate: string
            edit: string
          }>>(Prisma.sql`
            SELECT DISTINCT c.id, c.adddate, c.date, c.translate, c.edit
            FROM cdb_comics c
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
            ORDER BY c.adddate DESC
            LIMIT ${pageSize}
            OFFSET ${(page - 1) * pageSize}
          `)
          
          if (result.length === 0) {
            hasMore = false
          } else {
            allComics.push(...result)
            if (result.length < pageSize) {
              hasMore = false
            } else {
              page++
            }
          }
        } catch (pageError: any) {
          console.error(`[getScanlatorStats] Ошибка при получении страницы ${page}:`, pageError)
          hasMore = false
        }
      }
      
      comics = allComics
      console.log('[getScanlatorStats] SQL запрос выполнен успешно, найдено комиксов:', comics.length)
    } catch (sqlError: any) {
      console.error('[getScanlatorStats] Ошибка SQL запроса с Prisma.sql:', sqlError)
      console.error('[getScanlatorStats] Детали ошибки:', {
        code: sqlError?.code,
        message: sqlError?.message,
        meta: sqlError?.meta,
        stack: sqlError?.stack
      })
      // Пробуем альтернативный подход - используем обычный template literal
      console.log('[getScanlatorStats] Пробуем альтернативный подход с обычным template literal...')
      const patternMiddle = `%,${lowerQuery},%`
      const patternStart = `${lowerQuery},%`
      const patternEnd = `%,${lowerQuery}`
      
      try {
        comics = await prisma.$queryRaw<Array<{
          id: number
          adddate: Date
          date: Date | null
          translate: string
          edit: string
        }>>`
          SELECT DISTINCT c.id, c.adddate, c.date, c.translate, c.edit
          FROM cdb_comics c
          WHERE c.date_delete IS NULL
            AND c.adddate IS NOT NULL
            AND (
              LOWER(REPLACE(c.translate, ', ', ',')) LIKE ${patternMiddle}
              OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE ${patternStart}
              OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE ${patternEnd}
              OR LOWER(REPLACE(c.translate, ', ', ',')) = ${lowerQuery}
              OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE ${patternMiddle}
              OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE ${patternStart}
              OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE ${patternEnd}
              OR LOWER(REPLACE(c.edit, ', ', ',')) = ${lowerQuery}
            )
          ORDER BY c.adddate ASC
        `
        console.log('[getScanlatorStats] Альтернативный запрос выполнен, найдено комиксов:', comics.length)
      } catch (altError: any) {
        console.error('[getScanlatorStats] Ошибка альтернативного запроса:', altError)
        // Если и альтернативный запрос не работает, пробуем использовать searchByScanlators логику напрямую
        // но без пагинации - получаем все записи
        console.log('[getScanlatorStats] Пробуем использовать логику из searchByScanlators без LIMIT...')
        try {
          // Используем точно такой же запрос, как в searchByScanlators, но без LIMIT/OFFSET
          // Пробуем использовать обычный template literal, как в других местах
          const allComics = await prisma.$queryRaw<Array<{
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
          }>>`
            SELECT DISTINCT c.id, c.comicvine, c.number, c.serie, c.thumb, c.tiny, c.site, c.site2,
                   c.translate, c.edit, c.date, c.pdate, c.link, c.adddate
            FROM cdb_comics c
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
            ORDER BY c.adddate ASC
          `
          // Преобразуем в нужный формат
          comics = allComics.map(c => ({
            id: c.id,
            adddate: c.adddate,
            date: c.date,
            translate: c.translate,
            edit: c.edit
          }))
          console.log('[getScanlatorStats] Запрос через searchByScanlators логику выполнен, найдено комиксов:', comics.length)
        } catch (finalError: any) {
          console.error('[getScanlatorStats] Все попытки запроса провалились:', finalError)
          throw finalError // Пробрасываем ошибку дальше
        }
      }
    }

    console.log('[getScanlatorStats] Найдено комиксов:', comics.length)
    
    if (comics.length === 0) {
      console.log('[getScanlatorStats] Результатов нет, возвращаем null для:', trimmedName)
      // Для отладки: проверим, есть ли вообще записи с похожими именами
      const debugCheck = await prisma.$queryRaw<Array<{
        translate: string
        edit: string
        count: bigint
      }>>`
        SELECT c.translate, c.edit, COUNT(*) as count
        FROM cdb_comics c
        WHERE c.date_delete IS NULL
          AND (
            LOWER(c.translate) LIKE CONCAT('%', LOWER(${trimmedName}), '%')
            OR LOWER(c.edit) LIKE CONCAT('%', LOWER(${trimmedName}), '%')
          )
        GROUP BY c.translate, c.edit
        LIMIT 5
      `
      console.log('[getScanlatorStats] DEBUG: Похожие записи (первые 5):', debugCheck.map(c => ({
        translate: c.translate,
        edit: c.edit,
        count: Number(c.count)
      })))
      return null
    }
    
    // Сортируем по adddate для получения первого и последнего релиза
    const sortedComics = [...comics].sort((a, b) => {
      if (!a.adddate || !b.adddate) return 0
      return a.adddate.getTime() - b.adddate.getTime()
    })
    
    console.log('[getScanlatorStats] Первые 3 комикса для отладки:', sortedComics.slice(0, 3).map(c => ({
      id: c.id,
      translate: c.translate,
      edit: c.edit,
      adddate: c.adddate
    })))

    // Вычисляем статистику с обработкой ошибок
    let firstRelease: Date | null = null
    let lastRelease: Date | null = null
    
    try {
      if (sortedComics.length > 0) {
        firstRelease = sortedComics[0].adddate || null
        lastRelease = sortedComics[sortedComics.length - 1].adddate || null
        console.log('[getScanlatorStats] Первый релиз:', firstRelease, 'Последний:', lastRelease)
      }
    } catch (dateError: any) {
      console.error('[getScanlatorStats] Ошибка при вычислении дат:', dateError)
    }
    
    // Находим реальное имя сканлейтера из базы (первое вхождение)
    // Ищем без учета регистра, так как поиск тоже без учета регистра
    let realName = trimmedName
    for (const comic of comics) {
      if (comic.translate) {
        const translateList = comic.translate.split(',').map(s => s.trim())
        // Сначала ищем точное совпадение
        const found = translateList.find(s => s === trimmedName)
        if (found) {
          realName = found
          console.log('[getScanlatorStats] Найдено точное совпадение в translate:', found)
          break
        }
        // Если нет, ищем без учета регистра
        const foundLower = translateList.find(s => s.toLowerCase() === trimmedName.toLowerCase())
        if (foundLower) {
          realName = foundLower
          console.log('[getScanlatorStats] Найдено совпадение без учета регистра в translate:', foundLower)
          break
        }
      }
      if (comic.edit) {
        const editList = comic.edit.split(',').map(s => s.trim())
        // Сначала ищем точное совпадение
        const found = editList.find(s => s === trimmedName)
        if (found) {
          realName = found
          console.log('[getScanlatorStats] Найдено точное совпадение в edit:', found)
          break
        }
        // Если нет, ищем без учета регистра
        const foundLower = editList.find(s => s.toLowerCase() === trimmedName.toLowerCase())
        if (foundLower) {
          realName = foundLower
          console.log('[getScanlatorStats] Найдено совпадение без учета регистра в edit:', foundLower)
          break
        }
      }
    }
    
    console.log('[getScanlatorStats] Реальное имя:', realName)
    
    // Подсчет использует точное совпадение из найденных результатов
    // Если использовался поиск без учета регистра, находим реальное имя из базы
    const normalizeForMatch = (name: string, query: string): boolean => {
      const normalizedName = name.toLowerCase().trim()
      const normalizedQuery = query.toLowerCase().trim()
      return normalizedName === normalizedQuery
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
    
    // Вычисляем daysInScanlating с обработкой ошибок
    let daysInScanlating = 0
    try {
      if (firstRelease && lastRelease) {
        daysInScanlating = Math.floor((lastRelease.getTime() - firstRelease.getTime()) / (1000 * 60 * 60 * 24))
      }
    } catch (daysError: any) {
      console.error('[getScanlatorStats] Ошибка при вычислении daysInScanlating:', daysError)
    }

    // Формируем статистику только с теми полями, которые удалось вычислить
    const result: any = {
      total: comics.length,
      realName,
    }
    
    if (firstRelease) result.firstRelease = firstRelease
    if (lastRelease) result.lastRelease = lastRelease
    if (translatedCount > 0) result.translatedCount = translatedCount
    if (editedCount > 0) result.editedCount = editedCount
    if (daysInScanlating > 0) result.daysInScanlating = daysInScanlating
    
    console.log('[getScanlatorStats] Итоговая статистика для', trimmedName, ':', result)
    
    return result
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
  console.log('[SearchResults] Загружаем статистику для запроса:', query, 'defaultTab:', defaultTab)
  const scanlatorStats = query.trim() 
    ? await getScanlatorStats(query) 
    : null
  console.log('[SearchResults] Результат загрузки статистики:', scanlatorStats ? 'есть данные' : 'null')

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
