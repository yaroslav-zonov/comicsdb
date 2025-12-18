import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { decodeHtmlEntities, getImageUrl } from '@/lib/utils'

// Динамика переводов - группировка по месяцам
export async function getTranslationDynamics() {
  try {
    // Используем SQL для более эффективной группировки
    const monthlyData = await prisma.$queryRaw<Array<{
      year: bigint
      month: bigint
      count: bigint
    }>>(Prisma.sql`
      SELECT 
        YEAR(date) as year,
        MONTH(date) as month,
        COUNT(*) as count
      FROM cdb_comics
      WHERE date_delete IS NULL 
        AND date IS NOT NULL
      GROUP BY YEAR(date), MONTH(date)
      ORDER BY year ASC, month ASC
    `)

    // Преобразуем в нужный формат
    const result = monthlyData.map(row => ({
      date: `${Number(row.year)}-${String(Number(row.month)).padStart(2, '0')}`,
      count: Number(row.count),
      year: Number(row.year),
      month: Number(row.month),
    }))

    return result
  } catch (error) {
    console.error('Error fetching translation dynamics:', error)
    return []
  }
}

// Статистика по сайтам
export async function getSitesStats() {
  try {
    const sites = await prisma.site.findMany({
      where: {
        dateDelete: null,
        hidesite: false,
      },
      select: {
        id: true,
        name: true,
      },
    })

    // Получаем количество комиксов для каждого сайта
    const siteStats = await prisma.$queryRaw<Array<{
      site: string
      count: bigint
    }>>(Prisma.sql`
      SELECT 
        site,
        COUNT(*) as count
      FROM cdb_comics
      WHERE date_delete IS NULL
        AND site IS NOT NULL
      GROUP BY site
    `)

    const siteMap = new Map(siteStats.map(s => [s.site, Number(s.count)]))

    const result = sites
      .map(site => ({
        id: site.id,
        name: decodeHtmlEntities(site.name),
        count: siteMap.get(site.id) || 0,
      }))
      .sort((a, b) => b.count - a.count)

    return result
  } catch (error) {
    console.error('Error fetching sites stats:', error)
    return []
  }
}

// Итоги года - топ 10 сканлейтеров по количеству релизов за текущий год
export async function getTopScanlatorsByYear() {
  try {
    const currentYear = new Date().getFullYear()

    // ОПТИМИЗИРОВАННЫЙ SQL: агрегация на уровне БД вместо загрузки в память
    // Используем UNION для объединения переводчиков и оформителей
    const scanlators = await prisma.$queryRaw<Array<{
      name: string
      count: bigint
    }>>`
      SELECT
        TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(combined.names, ',', numbers.n), ',', -1)) as name,
        COUNT(*) as count
      FROM (
        SELECT CONCAT(COALESCE(translate, ''), ',', COALESCE(edit, '')) as names
        FROM cdb_comics
        WHERE date_delete IS NULL
          AND YEAR(date) = ${currentYear}
          AND (translate IS NOT NULL OR edit IS NOT NULL)
      ) as combined
      CROSS JOIN (
        SELECT 1 as n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
        SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL
        SELECT 9 UNION ALL SELECT 10
      ) as numbers
      WHERE CHAR_LENGTH(combined.names) - CHAR_LENGTH(REPLACE(combined.names, ',', '')) >= numbers.n - 1
        AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(combined.names, ',', numbers.n), ',', -1)) != ''
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10
    `

    // Преобразуем результат
    const topScanlators = scanlators.map(s => ({
      name: decodeHtmlEntities(s.name),
      count: Number(s.count),
    }))

    return {
      year: currentYear,
      topScanlators: topScanlators.map(s => ({
        siteId: s.name, // Используем имя как ID для совместимости
        siteName: s.name,
        count: s.count,
      })),
    }
  } catch (error) {
    console.error('Error fetching top scanlators by year:', error)
    return { year: new Date().getFullYear(), topScanlators: [] }
  }
}

// Дубль года - комикс с самым большим количеством переводов в этом году
export async function getMostTranslatedComicByYear() {
  try {
    const currentYear = new Date().getFullYear()

    const mostTranslated = await prisma.$queryRaw<Array<{
      comicvine: bigint
      serie: bigint
      count: bigint
    }>>(Prisma.sql`
      SELECT 
        comicvine,
        serie,
        COUNT(*) as count
      FROM cdb_comics
      WHERE date_delete IS NULL 
        AND date IS NOT NULL
        AND YEAR(date) = ${currentYear}
      GROUP BY comicvine, serie
      ORDER BY count DESC
      LIMIT 1
    `)

    if (mostTranslated.length === 0) return null

    const result = mostTranslated[0]
    
    // Получаем информацию о серии и обложку
    const series = await prisma.series.findUnique({
      where: { id: Number(result.serie) },
      include: {
        publisher: true,
        comics: {
          where: {
            comicvine: Number(result.comicvine),
            dateDelete: null,
            date: {
              gte: new Date(currentYear, 0, 1),
              lt: new Date(currentYear + 1, 0, 1),
            },
          },
          select: {
            number: true,
            thumb: true,
            tiny: true,
            comicvine: true,
          },
          orderBy: {
            number: 'asc',
          },
          take: 1,
        },
      },
    })

    if (!series) return null

    const comic = series.comics[0]

    const thumb = getImageUrl(comic?.thumb) || getImageUrl(comic?.tiny) || getImageUrl(series.thumb)

    return {
      comicvine: Number(result.comicvine),
      seriesName: decodeHtmlEntities(series.name),
      publisherName: decodeHtmlEntities(series.publisher.name),
      publisherId: series.publisher.id,
      seriesId: series.id,
      number: Number(comic?.number || 0),
      thumb,
      count: Number(result.count),
      year: currentYear,
    }
  } catch (error) {
    console.error('Error fetching most translated comic:', error)
    return null
  }
}

// Команда года - топ 10 сайтов с самым большим количеством релизов в этом году
export async function getTopSitesByYear() {
  try {
    const currentYear = new Date().getFullYear()

    const topSites = await prisma.$queryRaw<Array<{
      site: string
      count: bigint
    }>>(Prisma.sql`
      SELECT 
        site,
        COUNT(*) as count
      FROM cdb_comics
      WHERE date_delete IS NULL 
        AND date IS NOT NULL
        AND YEAR(date) = ${currentYear}
      GROUP BY site
      ORDER BY count DESC
      LIMIT 10
    `)

    // Получаем названия сайтов
    const siteIds = topSites.map(s => s.site)
    const sites = await prisma.site.findMany({
      where: {
        id: { in: siteIds },
        dateDelete: null,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const siteMap = new Map(sites.map(s => [s.id, decodeHtmlEntities(s.name)]))

    return {
      year: currentYear,
      topSites: topSites.map(s => ({
        siteId: s.site,
        siteName: siteMap.get(s.site) || s.site,
        count: Number(s.count),
      })),
    }
  } catch (error) {
    console.error('Error fetching top sites by year:', error)
    return { year: new Date().getFullYear(), topSites: [] }
  }
}

// Фрешмены года - топ 3 сканлейтера, которые в сканлейте меньше 1 года и первый релиз за всё время был в этом году
export async function getFreshmenByYear() {
  try {
    const currentYear = new Date().getFullYear()

    // ОПТИМИЗИРОВАННЫЙ SQL: один комплексный запрос для нахождения фрешменов
    // Находим сканлейтеров, чей первый релиз был в текущем году, и считаем их релизы за год
    const freshmen = await prisma.$queryRaw<Array<{
      name: string
      first_date: Date
      count: bigint
    }>>`
      WITH scanlator_first_dates AS (
        SELECT
          TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(combined.names, ',', numbers.n), ',', -1)) as name,
          MIN(c.date) as first_date
        FROM (
          SELECT id, date, CONCAT(COALESCE(translate, ''), ',', COALESCE(edit, '')) as names
          FROM cdb_comics
          WHERE date_delete IS NULL
            AND date IS NOT NULL
            AND (translate IS NOT NULL OR edit IS NOT NULL)
        ) as combined
        JOIN cdb_comics c ON c.id = combined.id
        CROSS JOIN (
          SELECT 1 as n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
          SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL
          SELECT 9 UNION ALL SELECT 10
        ) as numbers
        WHERE CHAR_LENGTH(combined.names) - CHAR_LENGTH(REPLACE(combined.names, ',', '')) >= numbers.n - 1
          AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(combined.names, ',', numbers.n), ',', -1)) != ''
        GROUP BY name
        HAVING YEAR(MIN(c.date)) = ${currentYear}
      ),
      scanlator_year_counts AS (
        SELECT
          TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(combined.names, ',', numbers.n), ',', -1)) as name,
          COUNT(DISTINCT combined.id) as count
        FROM (
          SELECT id, CONCAT(COALESCE(translate, ''), ',', COALESCE(edit, '')) as names
          FROM cdb_comics
          WHERE date_delete IS NULL
            AND YEAR(date) = ${currentYear}
            AND (translate IS NOT NULL OR edit IS NOT NULL)
        ) as combined
        CROSS JOIN (
          SELECT 1 as n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
          SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL
          SELECT 9 UNION ALL SELECT 10
        ) as numbers
        WHERE CHAR_LENGTH(combined.names) - CHAR_LENGTH(REPLACE(combined.names, ',', '')) >= numbers.n - 1
          AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(combined.names, ',', numbers.n), ',', -1)) != ''
        GROUP BY name
      )
      SELECT
        sfd.name,
        sfd.first_date,
        COALESCE(syc.count, 0) as count
      FROM scanlator_first_dates sfd
      LEFT JOIN scanlator_year_counts syc ON sfd.name = syc.name
      ORDER BY count DESC
      LIMIT 3
    `

    return {
      year: currentYear,
      freshmen: freshmen.map(f => ({
        siteId: decodeHtmlEntities(f.name),
        siteName: decodeHtmlEntities(f.name),
        firstDate: f.first_date,
        count: Number(f.count),
      })),
    }
  } catch (error) {
    console.error('Error fetching freshmen:', error)
    return { year: new Date().getFullYear(), freshmen: [] }
  }
}

