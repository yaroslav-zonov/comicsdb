import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SiteSeriesView from './SiteSeriesView'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, formatDate } from '@/lib/utils'

// Кэшируем на 2 минуты (данные сайтов меняются реже)
export const revalidate = 120
export const dynamic = 'force-dynamic'

async function getSite(id: string): Promise<{
  id: string
  name: string
  url: string | null
  totalComics: number
  firstRelease: Date | null
  lastRelease: Date | null
  series: Array<{
    id: number
    name: string
    publisher: { id: number; name: string }
    comics: Array<{
      id: number
      comicvine: number
      number: number
      date: Date | null
      pdate: Date | null
    }>
    lastDate: Date | null
    thumb: string | null
  }>
} | null> {
  try {
    const site = await prisma.site.findUnique({
      where: {
        id: id,
        dateDelete: null,
      },
    })

    if (!site) {
      return null
    }

    // Используем SQL запрос для получения всех комиксов этого сайта
    const comics = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      date: Date | null
      pdate: Date | null
      adddate: Date | null
      thumb: string | null
      tiny: string | null
      series_id: number
      series_name: string
      series_thumb: string | null
      publisher_id: number
      publisher_name: string
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        c.date,
        c.pdate,
        c.adddate,
        c.thumb,
        c.tiny,
        s.id as series_id,
        s.name as series_name,
        s.thumb as series_thumb,
        p.id as publisher_id,
        p.name as publisher_name
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      WHERE c.date_delete IS NULL
        AND (c.site = ${id} OR c.site2 = ${id})
      ORDER BY COALESCE(c.date, c.pdate, c.adddate) DESC
    `

    if (comics.length === 0) {
      return {
        id: site.id,
        name: decodeHtmlEntities(site.name),
        url: site.url,
        totalComics: 0,
        firstRelease: null,
        lastRelease: null,
        series: [],
      }
    }

    // Группируем комиксы по сериям
    const seriesMap = new Map<number, {
      id: number
      name: string
      publisher: { id: number; name: string }
      comics: Array<{
        id: number
        comicvine: number
        number: number
        date: Date | null
        pdate: Date | null
      }>
      lastDate: Date | null
      thumb: string | null
    }>()

    comics.forEach(comic => {
      const seriesId = comic.series_id
      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          id: comic.series_id,
          name: decodeHtmlEntities(comic.series_name),
          publisher: {
            id: comic.publisher_id,
            name: decodeHtmlEntities(comic.publisher_name),
          },
          comics: [],
          lastDate: null,
          thumb: null,
        })
      }

      const series = seriesMap.get(seriesId)!
      const comicDate = comic.date || comic.pdate || comic.adddate
      
      series.comics.push({
        id: comic.id,
        comicvine: comic.comicvine,
        number: Number(comic.number),
        date: comic.date,
        pdate: comic.pdate,
      })

      // Обновляем lastDate и thumb
      if (!series.lastDate || (comicDate && comicDate > series.lastDate)) {
        series.lastDate = comicDate
      }
      if (!series.thumb && (comic.thumb || comic.tiny || comic.series_thumb)) {
        series.thumb = comic.thumb || comic.tiny || comic.series_thumb
      }
    })

    // Сортируем комиксы в каждой серии по номеру
    seriesMap.forEach(series => {
      series.comics.sort((a, b) => a.number - b.number)
    })

    // Преобразуем в массив и сортируем по последней дате
    const seriesArray = Array.from(seriesMap.values()).sort((a, b) => {
      if (!a.lastDate) return 1
      if (!b.lastDate) return -1
      return b.lastDate.getTime() - a.lastDate.getTime()
    })

    // Вычисляем статистику
    const dates = comics
      .map(c => c.date || c.pdate || c.adddate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime())

    return {
      id: site.id,
      name: decodeHtmlEntities(site.name),
      url: site.url,
      totalComics: comics.length,
      firstRelease: dates.length > 0 ? dates[0] : null,
      lastRelease: dates.length > 0 ? dates[dates.length - 1] : null,
      series: seriesArray,
    }
  } catch (error) {
    console.error('Error fetching site:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return null
  }
}

export default async function SitePage({
  params,
}: {
  params: { id: string }
}) {
  const siteId = params.id
  
  if (!siteId) {
    notFound()
  }
  
  const site = await getSite(siteId)

  if (!site) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Хлебные крошки */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center space-x-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/sites" className="hover:text-accent transition-colors">
                  Сайты
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">{site.name}</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              {site.name}
            </h1>
            
            {site.url && (
              <div className="mb-4">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-accent hover:underline transition-colors"
                >
                  {site.url}
                </a>
              </div>
            )}

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <span className="text-sm text-text-secondary">Всего комиксов: </span>
                <span className="text-sm font-medium text-text-primary">
                  {site.totalComics}
                </span>
              </div>
              {site.firstRelease && (
                <div>
                  <span className="text-sm text-text-secondary">Первый релиз: </span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatDate(site.firstRelease)}
                  </span>
                </div>
              )}
              {site.lastRelease && (
                <div>
                  <span className="text-sm text-text-secondary">Последний релиз: </span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatDate(site.lastRelease)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Серии */}
          <SiteSeriesView series={site.series} />
        </div>
      </div>
      
      <Footer />
    </div>
  )
}
