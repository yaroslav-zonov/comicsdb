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
    // ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: один SQL запрос с COUNT(*) OVER() и всеми JOIN
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
 * Поиск комиксов по персонажам - точное совпадение
 * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует один SQL запрос с JOIN и правильной фильтрацией
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
    const encodedQuery = encodeHtmlEntities(trimmedQuery)

    // Определяем ORDER BY для SQL
    const getOrderByClause = (sortType: string): string => {
      switch (sortType) {
        case 'name_asc': return 's.name ASC'
        case 'name_desc': return 's.name DESC'
        case 'date_asc': return 'c.pdate ASC, c.adddate ASC'
        case 'date_desc': return 'c.pdate DESC, c.adddate DESC'
        case 'translation_date_asc': return 'COALESCE(c.date, c.pdate) ASC, c.adddate ASC'
        case 'translation_date_desc': return 'COALESCE(c.date, c.pdate) DESC, c.adddate DESC'
        default: return 'c.adddate DESC'
      }
    }

    // ОДИН оптимизированный запрос с JOIN, фильтрацией, сортировкой и пагинацией
    const results = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      serie_id: number
      thumb: string | null
      tiny: string | null
      site: string
      site2: string | null
      translate: string
      edit: string
      date: Date | null
      pdate: Date | null
      link: string
      adddate: Date | null
      series_name: string
      publisher_id: number
      publisher_name: string
      site1_name: string | null
      site2_name: string | null
      total_count: bigint
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        c.serie as serie_id,
        c.thumb,
        c.tiny,
        c.site,
        c.site2,
        c.translate,
        c.edit,
        CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 OR MONTH(c.date) = 0 OR DAY(c.date) = 0 THEN NULL ELSE c.date END as date,
        CASE WHEN c.pdate = '0000-00-00' OR YEAR(c.pdate) = 0 OR MONTH(c.pdate) = 0 OR DAY(c.pdate) = 0 THEN NULL ELSE c.pdate END as pdate,
        c.link,
        CASE WHEN c.adddate = '0000-00-00' OR YEAR(c.adddate) = 0 OR MONTH(c.adddate) = 0 OR DAY(c.adddate) = 0 THEN NULL ELSE c.adddate END as adddate,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        site1.name as site1_name,
        site2.name as site2_name,
        COUNT(*) OVER() as total_count
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      LEFT JOIN cdb_sites site1 ON c.site = site1.id AND site1.date_delete IS NULL
      LEFT JOIN cdb_sites site2 ON c.site2 = site2.id AND site2.date_delete IS NULL
      WHERE c.date_delete IS NULL
        AND c.characters IS NOT NULL
        AND c.characters != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(c.characters, ', ', ',')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(c.characters, ', ', ',')) > 0
        )
      ORDER BY ${Prisma.raw(getOrderByClause(sort))}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const total = results.length > 0 ? Number(results[0].total_count) : 0

    if (total === 0) {
      return {
        results: [],
        total: 0,
        page,
        pageSize,
        suggestions: [],
      }
    }

    return {
      results: results.map((comic) => {
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)

        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
          series: {
            id: comic.serie_id,
            name: decodeHtmlEntities(comic.series_name),
            publisher: {
              id: comic.publisher_id,
              name: decodeHtmlEntities(comic.publisher_name),
            },
          },
          thumb,
          tiny,
          siteName: comic.site1_name ? decodeHtmlEntities(comic.site1_name) : comic.site,
          siteId: comic.site,
          site2Name: comic.site2_name ? decodeHtmlEntities(comic.site2_name) : null,
          site2Id: comic.site2 && comic.site2 !== '0' ? comic.site2 : null,
          translate: decodeHtmlEntities(comic.translate),
          edit: decodeHtmlEntities(comic.edit),
          date: comic.date,
          pdate: comic.pdate,
          link: comic.link,
          hasGlobalEvent: globalComicIds.has(String(comic.id)),
          isJoint: !!comic.site2 && comic.site2 !== '0',
        }
      }),
      total,
      page,
      pageSize,
      suggestions: [],
    }
  } catch (error) {
    console.error('Error searching by characters:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Поиск комиксов по авторам - точное совпадение
 * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует один SQL запрос с JOIN и правильной фильтрацией
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
    const encodedQuery = trimmedQuery.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/&/g, '&amp;')

    // Определяем ORDER BY для SQL
    const getOrderByClause = (sortType: string): string => {
      switch (sortType) {
        case 'name_asc': return 's.name ASC'
        case 'name_desc': return 's.name DESC'
        case 'date_asc': return 'c.pdate ASC, c.adddate ASC'
        case 'date_desc': return 'c.pdate DESC, c.adddate DESC'
        case 'translation_date_asc': return 'COALESCE(c.date, c.pdate) ASC, c.adddate ASC'
        case 'translation_date_desc': return 'COALESCE(c.date, c.pdate) DESC, c.adddate DESC'
        default: return 'c.adddate DESC'
      }
    }

    // ОДИН оптимизированный запрос с JOIN, фильтрацией, сортировкой и пагинацией
    const results = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      serie_id: number
      thumb: string | null
      tiny: string | null
      site: string
      site2: string | null
      translate: string
      edit: string
      date: Date | null
      pdate: Date | null
      link: string
      adddate: Date | null
      series_name: string
      publisher_id: number
      publisher_name: string
      site1_name: string | null
      site2_name: string | null
      total_count: bigint
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        c.serie as serie_id,
        c.thumb,
        c.tiny,
        c.site,
        c.site2,
        c.translate,
        c.edit,
        CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 OR MONTH(c.date) = 0 OR DAY(c.date) = 0 THEN NULL ELSE c.date END as date,
        CASE WHEN c.pdate = '0000-00-00' OR YEAR(c.pdate) = 0 OR MONTH(c.pdate) = 0 OR DAY(c.pdate) = 0 THEN NULL ELSE c.pdate END as pdate,
        c.link,
        CASE WHEN c.adddate = '0000-00-00' OR YEAR(c.adddate) = 0 OR MONTH(c.adddate) = 0 OR DAY(c.adddate) = 0 THEN NULL ELSE c.adddate END as adddate,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        site1.name as site1_name,
        site2.name as site2_name,
        COUNT(*) OVER() as total_count
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      LEFT JOIN cdb_sites site1 ON c.site = site1.id AND site1.date_delete IS NULL
      LEFT JOIN cdb_sites site2 ON c.site2 = site2.id AND site2.date_delete IS NULL
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
      ORDER BY ${Prisma.raw(getOrderByClause(sort))}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const total = results.length > 0 ? Number(results[0].total_count) : 0

    if (total === 0) {
      return {
        results: [],
        total: 0,
        page,
        pageSize,
        suggestions: [],
      }
    }

    return {
      results: results.map((comic) => {
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)

        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
          series: {
            id: comic.serie_id,
            name: decodeHtmlEntities(comic.series_name),
            publisher: {
              id: comic.publisher_id,
              name: decodeHtmlEntities(comic.publisher_name),
            },
          },
          thumb,
          tiny,
          siteName: comic.site1_name ? decodeHtmlEntities(comic.site1_name) : comic.site,
          siteId: comic.site,
          site2Name: comic.site2_name ? decodeHtmlEntities(comic.site2_name) : null,
          site2Id: comic.site2 && comic.site2 !== '0' ? comic.site2 : null,
          translate: decodeHtmlEntities(comic.translate),
          edit: decodeHtmlEntities(comic.edit),
          date: comic.date,
          pdate: comic.pdate,
          link: comic.link,
          hasGlobalEvent: globalComicIds.has(String(comic.id)),
          isJoint: !!comic.site2 && comic.site2 !== '0',
        }
      }),
      total,
      page,
      pageSize,
      suggestions: [],
    }
  } catch (error) {
    console.error('Error searching by creators:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Поиск комиксов по командам - точное совпадение
 * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует один SQL запрос с JOIN и правильной фильтрацией
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
    const encodedQuery = trimmedQuery.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/&/g, '&amp;')

    // Определяем ORDER BY для SQL
    const getOrderByClause = (sortType: string): string => {
      switch (sortType) {
        case 'name_asc': return 's.name ASC'
        case 'name_desc': return 's.name DESC'
        case 'date_asc': return 'c.pdate ASC, c.adddate ASC'
        case 'date_desc': return 'c.pdate DESC, c.adddate DESC'
        case 'translation_date_asc': return 'COALESCE(c.date, c.pdate) ASC, c.adddate ASC'
        case 'translation_date_desc': return 'COALESCE(c.date, c.pdate) DESC, c.adddate DESC'
        default: return 'c.adddate DESC'
      }
    }

    // ОДИН оптимизированный запрос с JOIN, фильтрацией, сортировкой и пагинацией
    const results = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      serie_id: number
      thumb: string | null
      tiny: string | null
      site: string
      site2: string | null
      translate: string
      edit: string
      date: Date | null
      pdate: Date | null
      link: string
      adddate: Date | null
      series_name: string
      publisher_id: number
      publisher_name: string
      site1_name: string | null
      site2_name: string | null
      total_count: bigint
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        c.serie as serie_id,
        c.thumb,
        c.tiny,
        c.site,
        c.site2,
        c.translate,
        c.edit,
        CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 OR MONTH(c.date) = 0 OR DAY(c.date) = 0 THEN NULL ELSE c.date END as date,
        CASE WHEN c.pdate = '0000-00-00' OR YEAR(c.pdate) = 0 OR MONTH(c.pdate) = 0 OR DAY(c.pdate) = 0 THEN NULL ELSE c.pdate END as pdate,
        c.link,
        CASE WHEN c.adddate = '0000-00-00' OR YEAR(c.adddate) = 0 OR MONTH(c.adddate) = 0 OR DAY(c.adddate) = 0 THEN NULL ELSE c.adddate END as adddate,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        site1.name as site1_name,
        site2.name as site2_name,
        COUNT(*) OVER() as total_count
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      LEFT JOIN cdb_sites site1 ON c.site = site1.id AND site1.date_delete IS NULL
      LEFT JOIN cdb_sites site2 ON c.site2 = site2.id AND site2.date_delete IS NULL
      WHERE c.date_delete IS NULL
        AND c.teams IS NOT NULL
        AND c.teams != ''
        AND (
          FIND_IN_SET(${trimmedQuery}, REPLACE(c.teams, ', ', ',')) > 0
          OR FIND_IN_SET(${encodedQuery}, REPLACE(c.teams, ', ', ',')) > 0
        )
      ORDER BY ${Prisma.raw(getOrderByClause(sort))}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const total = results.length > 0 ? Number(results[0].total_count) : 0

    if (total === 0) {
      return {
        results: [],
        total: 0,
        page,
        pageSize,
        suggestions: [],
      }
    }

    return {
      results: results.map((comic) => {
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)

        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
          series: {
            id: comic.serie_id,
            name: decodeHtmlEntities(comic.series_name),
            publisher: {
              id: comic.publisher_id,
              name: decodeHtmlEntities(comic.publisher_name),
            },
          },
          thumb,
          tiny,
          siteName: comic.site1_name ? decodeHtmlEntities(comic.site1_name) : comic.site,
          siteId: comic.site,
          site2Name: comic.site2_name ? decodeHtmlEntities(comic.site2_name) : null,
          site2Id: comic.site2 && comic.site2 !== '0' ? comic.site2 : null,
          translate: decodeHtmlEntities(comic.translate),
          edit: decodeHtmlEntities(comic.edit),
          date: comic.date,
          pdate: comic.pdate,
          link: comic.link,
          hasGlobalEvent: globalComicIds.has(String(comic.id)),
          isJoint: !!comic.site2 && comic.site2 !== '0',
        }
      }),
      total,
      page,
      pageSize,
      suggestions: [],
    }
  } catch (error) {
    console.error('Error searching by teams:', error)
    return { results: [], total: 0, page: 1, pageSize: 100, suggestions: [] }
  }
}

/**
 * Поиск комиксов по сканлейтерам - точное совпадение
 * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует один SQL запрос с правильной фильтрацией
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
    const lowerQuery = trimmedQuery.toLowerCase()

    // Определяем ORDER BY для SQL
    const getOrderByClause = (sortType: string): string => {
      switch (sortType) {
        case 'name_asc': return 's.name ASC'
        case 'name_desc': return 's.name DESC'
        case 'date_asc': return 'c.pdate ASC, c.adddate ASC'
        case 'date_desc': return 'c.pdate DESC, c.adddate DESC'
        case 'translation_date_asc': return 'COALESCE(c.date, c.pdate) ASC, c.adddate ASC'
        case 'translation_date_desc': return 'COALESCE(c.date, c.pdate) DESC, c.adddate DESC'
        default: return 'c.adddate DESC'
      }
    }

    // ОДИН оптимизированный запрос с JOIN, фильтрацией, сортировкой и пагинацией
    // Используем COUNT(*) OVER() для получения total без дополнительного запроса
    const results = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      serie_id: number
      thumb: string | null
      tiny: string | null
      site: string
      site2: string | null
      translate: string
      edit: string
      date: Date | null
      pdate: Date | null
      link: string
      adddate: Date | null
      series_name: string
      publisher_id: number
      publisher_name: string
      total_count: bigint
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        c.serie as serie_id,
        c.thumb,
        c.tiny,
        c.site,
        c.site2,
        c.translate,
        c.edit,
        CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 OR MONTH(c.date) = 0 OR DAY(c.date) = 0 THEN NULL ELSE c.date END as date,
        CASE WHEN c.pdate = '0000-00-00' OR YEAR(c.pdate) = 0 OR MONTH(c.pdate) = 0 OR DAY(c.pdate) = 0 THEN NULL ELSE c.pdate END as pdate,
        c.link,
        CASE WHEN c.adddate = '0000-00-00' OR YEAR(c.adddate) = 0 OR MONTH(c.adddate) = 0 OR DAY(c.adddate) = 0 THEN NULL ELSE c.adddate END as adddate,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        COUNT(*) OVER() as total_count
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
      ORDER BY ${Prisma.raw(getOrderByClause(sort))}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const total = results.length > 0 ? Number(results[0].total_count) : 0

    if (total === 0) {
      return {
        results: [],
        total: 0,
        page,
        pageSize,
        suggestions: [],
      }
    }

    // Определяем реальный ник сканлейтера из списка
    const extractRealName = (field: string | null): string | null => {
      if (!field) return null
      const names = field.split(',').map(s => s.trim())
      return names.find(name => name.toLowerCase() === lowerQuery) || null
    }

    // Получаем сайты для отображения
    const siteIds = [...new Set(results.flatMap(r => [r.site, r.site2].filter((s): s is string => Boolean(s))))]
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
      results: results.map((comic) => {
        const realName = extractRealName(comic.translate) || extractRealName(comic.edit)
        const site1 = siteMap.get(comic.site)
        const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)

        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
          series: {
            id: comic.serie_id,
            name: decodeHtmlEntities(comic.series_name),
            publisher: {
              id: comic.publisher_id,
              name: decodeHtmlEntities(comic.publisher_name),
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
