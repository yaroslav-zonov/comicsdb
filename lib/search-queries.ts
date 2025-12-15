/**
 * Оптимизированные поисковые запросы
 * Выносим сложную логику поиска в отдельный модуль для переиспользования
 */

import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import { APP_CONFIG } from './config'
import { decodeHtmlEntities, getImageUrl } from './utils'
import { getOrderByClause, createCsvSearchCondition, extractNameFromCsv } from './search-helpers'

// Типы для результатов
export type SearchResult = {
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
  siteName: string
  siteId: string
  site2Name: string | null
  site2Id: string | null
  translate?: string
  edit?: string
  date: Date | null
  pdate: Date
  link: string
  hasGlobalEvent?: boolean
  isJoint: boolean
}

export type SearchResponse = {
  results: SearchResult[]
  total: number
  page: number
  pageSize: number
  suggestions: string[]
}

/**
 * Получает ID комиксов с глобальными событиями
 * Кэшируется в памяти на время запроса
 */
let globalComicIdsCache: Set<string> | null = null
let globalComicIdsCacheTime: number = 0
const GLOBAL_CACHE_TTL = 60000 // 1 минута

export async function getGlobalComicIds(): Promise<Set<string>> {
  const now = Date.now()

  if (globalComicIdsCache && (now - globalComicIdsCacheTime) < GLOBAL_CACHE_TTL) {
    return globalComicIdsCache
  }

  try {
    const globalComics = await prisma.$queryRaw<Array<{ comics: string }>>`
      SELECT DISTINCT comics FROM cdb_globcom WHERE date_delete IS NULL
    `
    globalComicIdsCache = new Set(globalComics.map(g => g.comics))
    globalComicIdsCacheTime = now
    return globalComicIdsCache
  } catch (error) {
    console.error('Error getting global comic IDs:', error)
    return new Set()
  }
}

/**
 * Оптимизированный поиск по сканлейтерам
 * Использует один запрос с JOIN вместо множественных запросов
 */
export async function searchByScanlators(
  query: string,
  page: number = 1,
  sort: string = 'adddate_desc'
): Promise<SearchResponse> {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: APP_CONFIG.pagination.searchPageSize, suggestions: [] }
    }

    const pageSize = APP_CONFIG.pagination.searchPageSize
    const skip = (page - 1) * pageSize
    const lowerQuery = trimmedQuery.toLowerCase()

    // Один оптимизированный запрос с JOIN для получения всех данных
    // включая series и publisher
    const orderBy = getOrderByClause(sort)

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
      pdate: Date
      link: string
      adddate: Date
      series_name: string
      publisher_id: number
      publisher_name: string
      total_count: number
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
        c.date,
        c.pdate,
        c.link,
        c.adddate,
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
      ORDER BY ${Prisma.raw(orderBy)}
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

    // Получаем названия сайтов одним запросом
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

    const globalComicIds = await getGlobalComicIds()

    // Преобразуем результаты
    const searchResults: SearchResult[] = results.map(comic => {
      const realName = extractNameFromCsv(comic.translate, trimmedQuery) ||
                       extractNameFromCsv(comic.edit, trimmedQuery)
      const site1 = siteMap.get(comic.site)
      const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null

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
        thumb: getImageUrl(comic.thumb),
        tiny: getImageUrl(comic.tiny),
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
    })

    return {
      results: searchResults,
      total,
      page,
      pageSize,
      suggestions: [],
    }
  } catch (error) {
    console.error('Error searching by scanlators:', error)
    return {
      results: [],
      total: 0,
      page: 1,
      pageSize: APP_CONFIG.pagination.searchPageSize,
      suggestions: []
    }
  }
}

/**
 * Универсальная функция поиска по CSV-полям
 * Заменяет дублирование кода в searchByCharacters, searchByCreators, searchByTeams
 *
 * @param field - Имя поля для поиска ('characters', 'creators', 'teams', 'translate', 'edit')
 * @param query - Поисковый запрос
 * @param page - Номер страницы
 * @param sort - Тип сортировки
 */
export async function searchComicsByField(
  field: 'characters' | 'creators' | 'teams' | 'translate' | 'edit',
  query: string,
  page: number = 1,
  sort: string = 'adddate_desc'
): Promise<SearchResponse> {
  try {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { results: [], total: 0, page: 1, pageSize: APP_CONFIG.pagination.searchPageSize, suggestions: [] }
    }

    const pageSize = APP_CONFIG.pagination.searchPageSize
    const skip = (page - 1) * pageSize
    const lowerQuery = trimmedQuery.toLowerCase()
    const orderBy = getOrderByClause(sort)

    // Динамическое SQL условие поиска
    const searchCondition = createCsvSearchCondition(`c.${field}`, lowerQuery)

    const results = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      serie_id: number
      thumb: string | null
      tiny: string | null
      site: string
      site2: string | null
      field_value: string
      date: Date | null
      pdate: Date
      link: string
      adddate: Date
      series_name: string
      publisher_id: number
      publisher_name: string
      total_count: number
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
        c.${Prisma.raw(field)} as field_value,
        c.date,
        c.pdate,
        c.link,
        c.adddate,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        COUNT(*) OVER() as total_count
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      WHERE c.date_delete IS NULL
        AND ${searchCondition}
      ORDER BY ${Prisma.raw(orderBy)}
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

    // Получаем названия сайтов одним запросом
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

    const globalComicIds = await getGlobalComicIds()

    // Преобразуем результаты
    const searchResults: SearchResult[] = results.map(comic => {
      const realName = extractNameFromCsv(comic.field_value, trimmedQuery)
      const site1 = siteMap.get(comic.site)
      const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null

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
        thumb: getImageUrl(comic.thumb),
        tiny: getImageUrl(comic.tiny),
        siteName: site1 ? decodeHtmlEntities(site1) : comic.site,
        siteId: comic.site,
        site2Name: site2 ? decodeHtmlEntities(site2) : null,
        site2Id: site2 ? comic.site2 : null,
        [field]: realName || decodeHtmlEntities(comic.field_value),
        date: comic.date,
        pdate: comic.pdate,
        link: comic.link,
        hasGlobalEvent: globalComicIds.has(String(comic.id)),
        isJoint: !!site2,
      }
    })

    return {
      results: searchResults,
      total,
      page,
      pageSize,
      suggestions: [],
    }
  } catch (error) {
    console.error(`Error searching by ${field}:`, error)
    return {
      results: [],
      total: 0,
      page: 1,
      pageSize: APP_CONFIG.pagination.searchPageSize,
      suggestions: []
    }
  }
}
