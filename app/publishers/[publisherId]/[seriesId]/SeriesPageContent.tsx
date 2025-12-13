import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeriesComicsView from '@/components/SeriesComicsView'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, getSeriesUrl, getTranslationStatus, getImageUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getSeries(id: number) {
  try {
    const series = await prisma.series.findUnique({
      where: {
        id: id,
        dateDelete: null,
      },
      include: {
        publisher: true,
        cdb_series_genres: {
          include: {
            cdb_zhanr: true,
          },
        },
        comics: {
          where: {
            dateDelete: null,
          },
          orderBy: [
            {
              number: 'asc',
            },
          ],
          take: 200,
          include: {
            series: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!series) {
      return null
    }

    const siteIds = [...new Set(series.comics.flatMap(c => [c.site, c.site2].filter(Boolean)))]
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
    const siteMap = new Map(sites.map(s => [s.id, s.name]))

    const genres = series.cdb_series_genres
      .filter(sg => !sg.cdb_zhanr.date_delete)
      .map(sg => decodeHtmlEntities(sg.cdb_zhanr.name))

    // Вычисляем статус перевода исходя из даты последней публикации перевода (date)
    const translatedCount = series.comics.length
    const totalIssues = series.comicvine || series.total || 0
    const lastTranslationDate = series.comics.length > 0 
      ? series.comics.reduce<Date | null>((latest, comic) => {
          const date = comic.date // Используем только date (дату перевода), а не pdate
          if (!date) return latest
          if (!latest) return date
          return date > latest ? date : latest
        }, series.comics.find(c => c.date)?.date || null)
      : null
    const translationStatus = getTranslationStatus(
      translatedCount,
      totalIssues,
      lastTranslationDate,
      series.status
    )

    return {
      id: series.id,
      name: decodeHtmlEntities(series.name),
      volume: series.volume,
      publisher: {
        id: series.publisher.id,
        name: decodeHtmlEntities(series.publisher.name),
      },
      thumb: getImageUrl(series.thumb),
      small: getImageUrl(series.small),
      super: getImageUrl(series.super),
      status: series.status,
      comicvine: series.comicvine,
      first: series.first,
      total: series.total,
      updated: series.updated,
      lastIssue: series.lastIssue,
      genres,
      translationStatus,
      comics: await Promise.all(series.comics.map(async (comic) => ({
        id: comic.id,
        comicvine: comic.comicvine,
        number: Number(comic.number),
        pdate: comic.pdate,
        date: comic.date,
        thumb: await getImageUrlWithMetron(comic.comicvine, comic.thumb),
        tiny: await getImageUrlWithMetron(comic.comicvine, comic.tiny),
        site: comic.site,
        siteName: decodeHtmlEntities(siteMap.get(comic.site) || comic.site),
        siteId: comic.site,
        site2: comic.site2,
        site2Name: comic.site2 && comic.site2 !== '0' ? decodeHtmlEntities(siteMap.get(comic.site2) || comic.site2) : null,
        translate: comic.translate,
        edit: comic.edit,
        link: comic.link,
        series: {
          id: series.id,
          name: decodeHtmlEntities(series.name),
          publisher: {
            id: series.publisher.id,
            name: decodeHtmlEntities(series.publisher.name),
          },
        },
      })),
    }
  } catch (error) {
    console.error('Error fetching series:', error)
    return null
  }
}

export async function generateMetadata({
  seriesId,
}: {
  seriesId: number
}): Promise<Metadata> {
  const series = await getSeries(seriesId)
  if (!series) {
    return {
      title: 'Серия не найдена',
    }
  }

  return {
    title: `${series.name} - ${series.publisher.name} | ComicsDB`,
    description: `Серия комиксов ${series.name} от издательства ${series.publisher.name}. ${series.genres.length > 0 ? `Жанры: ${series.genres.join(', ')}.` : ''} Переведено ${series.comics.length} из ${series.total || series.comics.length} выпусков.`,
  }
}

export default async function SeriesPageContent({
  seriesId,
}: {
  seriesId: number
}) {
  const series = await getSeries(seriesId)

  if (!series) {
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
              <Link
                href={`/publishers/${series.publisher.id}`}
                className="hover:text-accent transition-colors"
              >
                {series.publisher.name}
              </Link>
            </li>
            <li>/</li>
              <li className="text-text-primary">{series.name}</li>
          </ol>
        </nav>

        {/* Заголовок серии */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            {series.name}
            {series.volume && series.volume !== '0' && (
              <span className="text-2xl text-text-secondary ml-2">
                ({series.volume})
              </span>
            )}
          </h1>

          <div className="space-y-4 mt-6">
            <div className="text-sm text-text-primary">
              <Link
                href={`/publishers/${series.publisher.id}`}
                className="text-accent hover:text-accent-hover hover:underline"
              >
                {series.publisher.name}
              </Link>
              <span className="text-text-tertiarymx-2">•</span>
              <span className="text-sm text-text-secondary">Статус серии: </span>
              <span className="text-sm font-medium text-text-primary">
                {series.status === 'comicvine' ? 'Статус неизвестен' :
                 series.status === 'continue' ? 'Продолжается' :
                 series.status === 'finish' ? 'Завершена' :
                 series.status === 'freez' ? 'Заморожена' : series.status}
              </span>
              <span className="text-text-tertiarymx-2">•</span>
              <span className="text-sm text-text-secondary">Статус перевода: </span>
              <span className="text-sm font-medium text-text-primary">
                {series.translationStatus}
              </span>
              <span className="text-text-tertiarymx-2">•</span>
              <span className="text-sm text-text-secondary">Переведено: </span>
              <span className="text-sm font-medium text-text-primary">
                {series.comics.length}
                {series.comicvine > 0 && ` из ${series.comicvine}`}
              </span>
              {series.genres.length > 0 && (
                <>
                  <span className="text-text-tertiarymx-2">•</span>
                  <span>
                    {series.genres.map((genre, idx) => (
                      <span key={idx}>
                        <Link
                          href={`/search?q=${encodeURIComponent(genre)}&tab=series`}
                          className="text-accent hover:text-accent-hover hover:underline"
                        >
                          {genre}
                        </Link>
                        {idx < series.genres.length - 1 && <span>, </span>}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Список комиксов */}
        <div className="overflow-hidden">
          <SeriesComicsView comics={series.comics} />
        </div>
      </div>
      </div>
      
      <Footer />
    </div>
  )
}

