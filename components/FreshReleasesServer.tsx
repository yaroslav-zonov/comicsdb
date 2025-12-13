import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities } from '@/lib/utils'

type Comic = {
  id: number
  comicvine: number
  number: number
  pdate: Date
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
    // Вычисляем дату 7 дней назад
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Получаем комиксы, опубликованные за последние 7 дней
    // Используем только date и pdate (даты публикации), не adddate (дата добавления)
    const comics = await prisma.comic.findMany({
      take: 200, // Берем больше для фильтрации
      where: {
        dateDelete: null,
        OR: [
          {
            date: {
              gte: sevenDaysAgo,
            },
          },
          {
            AND: [
              {
                date: null,
              },
              {
                pdate: {
                  gte: sevenDaysAgo,
                },
              },
            ],
          },
        ],
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
      },
      orderBy: {
        adddate: 'desc',
      },
    })

    // Сортируем вручную: сначала по date (если есть), потом по pdate
    const sortedComics = comics.sort((a, b) => {
      const getDate = (comic: typeof a) => {
        if (comic.date) return new Date(comic.date).getTime()
        if (comic.pdate) return new Date(comic.pdate).getTime()
        return new Date(comic.adddate).getTime()
      }
      
      const dateA = getDate(a)
      const dateB = getDate(b)
      return dateB - dateA
    })

    // Получаем уникальные ID сайтов (включая site2)
    const allSiteIds = [...new Set([
      ...sortedComics.map(c => c.site).filter(Boolean),
      ...sortedComics.map(c => c.site2).filter(s => s && s !== '0')
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
    return sortedComics.map(comic => {
      const site1 = siteMap.get(comic.site)
      const site2 = comic.site2 && comic.site2 !== '0' ? siteMap.get(comic.site2) : null
      
      return {
        id: comic.id,
        comicvine: comic.comicvine,
        number: Number(comic.number),
        pdate: comic.pdate,
        date: comic.date,
        series: {
          ...comic.series,
          name: decodeHtmlEntities(comic.series.name),
          publisher: {
            ...comic.series.publisher,
            name: decodeHtmlEntities(comic.series.publisher.name),
          },
        },
        thumb: comic.thumb,
        tiny: comic.tiny,
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

