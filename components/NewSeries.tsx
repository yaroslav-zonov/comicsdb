import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { decodeHtmlEntities, getImageUrl } from '@/lib/utils'
import ComicCard from './ComicCard'

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
}

async function getNewSeries(limit: number = 4): Promise<Comic[]> {
  try {
    // Находим новые серии по дате добавления первого выпуска
    // Используем raw query для поиска первых выпусков новых серий
    const limitValue = limit * 2
    const result = await prisma.$queryRaw<Array<{
      comic_id: number
      comicvine: number
      series_id: number
      series_name: string
      publisher_id: number
      publisher_name: string
      number: number
      pdate: Date
      date: Date | null
      thumb: string
      tiny: string
      translate: string
      site: string
      adddate: Date
    }>>(Prisma.sql`
      SELECT 
        c.id as comic_id,
        c.comicvine,
        s.id as series_id,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        c.number,
        c.pdate,
        c.date,
        c.thumb,
        c.tiny,
        c.translate,
        c.site,
        c.adddate
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id
      INNER JOIN cdb_publishers p ON s.publisher = p.id
      WHERE c.date_delete IS NULL
        AND s.date_delete IS NULL
        AND c.number = CAST(s.first AS DECIMAL(8,1))
      ORDER BY c.adddate DESC
      LIMIT ${limitValue}
    `)

    // Группируем по сериям, чтобы взять только одну серию один раз
    const seenSeries = new Set<number>()
    const uniqueSeries = result.filter(item => {
      if (seenSeries.has(item.series_id)) {
        return false
      }
      seenSeries.add(item.series_id)
      return true
    }).slice(0, limit)

    // Получаем уникальные ID сайтов
    const siteIds = [...new Set(uniqueSeries.map(s => s.site).filter(Boolean))]
    
    // Получаем названия сайтов
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

    // Преобразуем в нужный формат
    return uniqueSeries.map(item => ({
      id: item.comic_id,
      comicvine: item.comicvine,
      number: Number(item.number),
      pdate: item.pdate,
      date: item.date,
      series: {
        id: item.series_id,
        name: decodeHtmlEntities(item.series_name),
        publisher: {
          id: item.publisher_id,
          name: decodeHtmlEntities(item.publisher_name),
        },
      },
      thumb: getImageUrl(item.thumb) || '',
      tiny: getImageUrl(item.tiny) || '',
      translate: item.translate,
      site: item.site,
      siteName: decodeHtmlEntities(siteMap.get(item.site) || item.site),
    }))
  } catch (error) {
    console.error('Error fetching new series:', error)
    return []
  }
}

export default async function NewSeries() {
  let comics: Comic[] = []
  
  try {
    comics = await getNewSeries(5)
  } catch (error) {
    console.error('Error in NewSeries component:', error)
  }

  if (comics.length === 0) {
    return null
  }

  return (
    <section className="section-spacing bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary">Новые серии</h2>
        </div>

        {/* Мобильная версия с горизонтальным скроллом */}
        <div className="md:hidden overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-4" style={{ width: 'max-content' }}>
            {comics.map((comic) => (
              <div key={comic.id} className="flex-shrink-0" style={{ width: 'calc(66.666vw - 1rem)' }}>
                <ComicCard
                  data={{
                    id: comic.id,
                    comicvine: comic.comicvine,
                    number: comic.number,
                    series: comic.series,
                    thumb: comic.thumb,
                    tiny: comic.tiny,
                    siteName: comic.siteName,
                  }}
                  showCover={true}
                  showTitle={true}
                  titleMode="full"
                  showPublisher={false}
                  showSite={true}
                  showDate={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Десктопная версия с сеткой */}
        <div className="hidden md:grid md:grid-cols-5 gap-4">
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
              }}
              showCover={true}
              showTitle={true}
              showPublisher={false}
              showSite={true}
              showDate={false}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

