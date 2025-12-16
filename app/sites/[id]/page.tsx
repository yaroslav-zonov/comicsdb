import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SiteSeriesView from './SiteSeriesView'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, formatDate } from '@/lib/utils'

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

    // Получаем все комиксы этого сайта
    const comics = await prisma.comic.findMany({
      where: {
        OR: [
          { site: id },
          { site2: id },
        ],
        dateDelete: null,
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
      take: 10000, // Увеличиваем лимит
    })

    // Группируем по сериям
    const seriesMap = new Map<number, {
      series: typeof comics[0]['series']
      comics: typeof comics
      lastDate: Date | null
      firstComic: typeof comics[0] | null
    }>()

    comics.forEach(comic => {
      const seriesId = comic.series.id
      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          series: comic.series,
          comics: [],
          lastDate: comic.date || comic.pdate || comic.adddate,
          firstComic: null,
        })
      }
      const entry = seriesMap.get(seriesId)!
      entry.comics.push(comic)
      const comicDate = comic.date || comic.pdate || comic.adddate
      if (comicDate && entry.lastDate && comicDate > entry.lastDate) {
        entry.lastDate = comicDate
      } else if (comicDate && !entry.lastDate) {
        entry.lastDate = comicDate
      }
      // Сохраняем первый комикс для обложки
      if (!entry.firstComic || comic.number < entry.firstComic.number) {
        entry.firstComic = comic
      }
    })

    // Сортируем серии по дате последнего перевода
    const sortedSeries = Array.from(seriesMap.values()).sort((a, b) =>
      (b.lastDate?.getTime() || 0) - (a.lastDate?.getTime() || 0)
    )

    // Получаем статистику
    const totalComics = comics.length
    const firstRelease = comics.length > 0 
      ? comics.reduce((earliest, comic) => {
          const date = comic.date || comic.pdate || comic.adddate
          return date < earliest ? date : earliest
        }, comics[0].date || comics[0].pdate || comics[0].adddate)
      : null
    const lastRelease = comics.length > 0
      ? comics.reduce((latest, comic) => {
          const date = comic.date || comic.pdate || comic.adddate
          return date > latest ? date : latest
        }, comics[0].date || comics[0].pdate || comics[0].adddate)
      : null

    return {
      id: site.id,
      name: decodeHtmlEntities(site.name),
      url: site.url,
      totalComics,
      firstRelease,
      lastRelease,
      series: sortedSeries.map(entry => ({
        id: entry.series.id,
        name: decodeHtmlEntities(entry.series.name),
        publisher: {
          id: entry.series.publisher.id,
          name: decodeHtmlEntities(entry.series.publisher.name),
        },
        comics: entry.comics.map(c => ({
          id: c.id,
          comicvine: c.comicvine,
          number: Number(c.number),
          date: c.date,
          pdate: c.pdate,
        })),
        lastDate: entry.lastDate,
        thumb: entry.firstComic?.thumb || entry.firstComic?.tiny || entry.series.thumb,
      })),
    }
  } catch (error) {
    console.error('Error fetching site:', error)
    return null
  }
}

export default async function SitePage({
  params,
}: {
  params: { id: string }
}) {
  const site = await getSite(params.id)

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
                  className="text-accent hover:text-accent-hover hover:text-accent hover:underline"
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
