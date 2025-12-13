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

    // Получаем все комиксы за текущий год с переводчиками и оформителями
    const comics = await prisma.comic.findMany({
      where: {
        dateDelete: null,
        date: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      select: {
        translate: true,
        edit: true,
      },
    })

    // Собираем всех сканлейтеров (переводчики + оформители)
    const scanlatorCounts = new Map<string, number>()
    
    comics.forEach(comic => {
      // Обрабатываем переводчиков
      if (comic.translate && comic.translate.trim()) {
        const translators = comic.translate.split(',').map(t => t.trim()).filter(t => t)
        translators.forEach(translator => {
          scanlatorCounts.set(translator, (scanlatorCounts.get(translator) || 0) + 1)
        })
      }
      
      // Обрабатываем оформителей
      if (comic.edit && comic.edit.trim()) {
        const editors = comic.edit.split(',').map(e => e.trim()).filter(e => e)
        editors.forEach(editor => {
          scanlatorCounts.set(editor, (scanlatorCounts.get(editor) || 0) + 1)
        })
      }
    })

    // Сортируем и берем топ 10
    const topScanlators = Array.from(scanlatorCounts.entries())
      .map(([name, count]) => ({ name: decodeHtmlEntities(name), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

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
    const oneYearAgo = new Date(currentYear, 0, 1)

    // Получаем ВСЕ комиксы (не только за этот год) для поиска первого релиза каждого сканлейтера
    const allComics = await prisma.comic.findMany({
      where: {
        dateDelete: null,
        date: { not: null },
      },
      select: {
        translate: true,
        edit: true,
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Находим первый релиз каждого сканлейтера за всё время
    const scanlatorFirstDates = new Map<string, Date>()
    
    allComics.forEach(comic => {
      if (!comic.date) return

      // Обрабатываем переводчиков
      if (comic.translate && comic.translate.trim()) {
        const translators = comic.translate.split(',').map(t => t.trim()).filter(t => t)
        translators.forEach(translator => {
          if (!scanlatorFirstDates.has(translator) || comic.date! < scanlatorFirstDates.get(translator)!) {
            scanlatorFirstDates.set(translator, comic.date!)
          }
        })
      }
      
      // Обрабатываем оформителей
      if (comic.edit && comic.edit.trim()) {
        const editors = comic.edit.split(',').map(e => e.trim()).filter(e => e)
        editors.forEach(editor => {
          if (!scanlatorFirstDates.has(editor) || comic.date! < scanlatorFirstDates.get(editor)!) {
            scanlatorFirstDates.set(editor, comic.date!)
          }
        })
      }
    })

    // Фильтруем: первый релиз был в этом году (в сканлейте меньше 1 года)
    const currentYearStart = new Date(currentYear, 0, 1)
    const freshmenCandidates = Array.from(scanlatorFirstDates.entries())
      .filter(([name, firstDate]) => {
        // Первый релиз должен быть в этом году
        return firstDate >= currentYearStart && firstDate < new Date(currentYear + 1, 0, 1)
      })
      .map(([name, firstDate]) => name)

    if (freshmenCandidates.length === 0) {
      return { year: currentYear, freshmen: [] }
    }

    // Подсчитываем количество релизов за этот год для фрешменов
    const comicsThisYear = await prisma.comic.findMany({
      where: {
        dateDelete: null,
        date: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      select: {
        translate: true,
        edit: true,
      },
    })

    const scanlatorCounts = new Map<string, number>()
    
    comicsThisYear.forEach(comic => {
      // Обрабатываем переводчиков
      if (comic.translate && comic.translate.trim()) {
        const translators = comic.translate.split(',').map(t => t.trim()).filter(t => t)
        translators.forEach(translator => {
          if (freshmenCandidates.includes(translator)) {
            scanlatorCounts.set(translator, (scanlatorCounts.get(translator) || 0) + 1)
          }
        })
      }
      
      // Обрабатываем оформителей
      if (comic.edit && comic.edit.trim()) {
        const editors = comic.edit.split(',').map(e => e.trim()).filter(e => e)
        editors.forEach(editor => {
          if (freshmenCandidates.includes(editor)) {
            scanlatorCounts.set(editor, (scanlatorCounts.get(editor) || 0) + 1)
          }
        })
      }
    })

    // Сортируем и берем топ 3
    const freshmen = Array.from(scanlatorCounts.entries())
      .map(([name, count]) => ({
        name: decodeHtmlEntities(name),
        firstDate: scanlatorFirstDates.get(name)!,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return {
      year: currentYear,
      freshmen: freshmen.map(f => ({
        siteId: f.name,
        siteName: f.name,
        firstDate: f.firstDate,
        count: f.count,
      })),
    }
  } catch (error) {
    console.error('Error fetching freshmen:', error)
    return { year: new Date().getFullYear(), freshmen: [] }
  }
}

