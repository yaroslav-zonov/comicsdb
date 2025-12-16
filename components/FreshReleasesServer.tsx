import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, getImageUrl } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/config'

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
  thumb: string
  tiny: string
  translate: string
  site: string
  siteName: string | null
  link: string
}

async function getFreshReleases(): Promise<Comic[]> {
  try {
    // Вычисляем дату N дней назад (из конфига)
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - APP_CONFIG.freshReleases.daysAgo)
    daysAgo.setHours(0, 0, 0, 0)

    // Используем raw SQL для эффективной сортировки по COALESCE(date, pdate, adddate)
    // Это избавляет от необходимости загружать 200 записей и сортировать их в памяти
    const comics = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      pdate: Date
      date: Date | null
      adddate: Date
      thumb: string
      tiny: string
      translate: string
      site: string
      site2: string | null
      link: string
      series_id: number
      series_name: string
      publisher_id: number
      publisher_name: string
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        c.pdate,
        c.date,
        c.adddate,
        c.thumb,
        c.tiny,
        c.translate,
        c.site,
        c.site2,
        c.link,
        s.id as series_id,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id
      INNER JOIN cdb_publishers p ON s.publisher = p.id
      WHERE c.date_delete IS NULL
        AND s.date_delete IS NULL
        AND (
          c.date >= ${daysAgo}
          OR (c.date IS NULL AND c.pdate >= ${daysAgo})
        )
      ORDER BY COALESCE(c.date, c.pdate, c.adddate) DESC
      LIMIT ${APP_CONFIG.freshReleases.limit}
    `

    // Получаем уникальные ID сайтов (включая site2)
    const allSiteIds = [...new Set([
      ...comics.map(c => c.site).filter((s): s is string => Boolean(s)),
      ...comics.map(c => c.site2).filter((s): s is string => Boolean(s) && s !== '0')
    ])]

    // Получаем названия сайтов
    const sites = allSiteIds.length > 0 ? await prisma.site.findMany({
      where: {
        id: { in: allSiteIds },
        dateDelete: null,
      },
      select: {
        id: true,
        name: true,
      },
    }) : []

    const siteMap = new Map(sites.map(s => [s.id, s.name]))

    // Преобразуем в нужный формат
    return comics.map(comic => {
      const site1 = siteMap.get(comic.site)
      const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null

      return {
        id: comic.id,
        comicvine: comic.comicvine,
        number: Number(comic.number),
        pdate: comic.pdate,
        date: comic.date,
        series: {
          id: comic.series_id,
          name: decodeHtmlEntities(comic.series_name),
          publisher: {
            id: comic.publisher_id,
            name: decodeHtmlEntities(comic.publisher_name),
          },
        },
        thumb: getImageUrl(comic.thumb) || '',
        tiny: getImageUrl(comic.tiny) || '',
        translate: comic.translate,
        site: comic.site,
        siteName: site1 ? decodeHtmlEntities(site1) : comic.site,
        siteId: comic.site,
        site2: comic.site2,
        site2Name: site2 ? decodeHtmlEntities(site2) : null,
        site2Id: site2 ? comic.site2 : null,
        link: comic.link,
        isJoint: !!site2,
      }
    })
  } catch (error) {
    console.error('Error fetching fresh releases:', error)
    return []
  }
}

export default async function FreshReleasesServer() {
  let comics: Comic[] = []
  
  try {
    comics = await getFreshReleases()
  } catch (error) {
    console.error('Error in FreshReleasesServer component:', error)
  }

  // Используем динамический импорт для клиентского компонента
  const FreshReleases = (await import('./FreshReleases')).default

  return <FreshReleases comics={comics} />
}

