import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeriesComicsView from '@/components/SeriesComicsView'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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
      },
    })

    if (!series) {
      return null
    }

    // ОПТИМИЗИРОВАННЫЙ SQL: один запрос с LEFT JOIN для сайтов вместо двух отдельных
    // Убрано include: { series } т.к. данные серии уже есть в переменной series
    const comics = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      pdate: Date | null
      date: Date | null
      thumb: string | null
      tiny: string | null
      site: string
      site2: string | null
      translate: string
      edit: string
      link: string
      site1_name: string | null
      site2_name: string | null
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        CASE WHEN c.pdate = '0000-00-00' OR YEAR(c.pdate) = 0 THEN NULL ELSE c.pdate END as pdate,
        CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 THEN NULL ELSE c.date END as date,
        c.thumb,
        c.tiny,
        c.site,
        c.site2,
        c.translate,
        c.edit,
        c.link,
        site1.name as site1_name,
        site2.name as site2_name
      FROM cdb_comics c
      LEFT JOIN cdb_sites site1 ON c.site = site1.id AND site1.date_delete IS NULL
      LEFT JOIN cdb_sites site2 ON c.site2 = site2.id AND site2.date_delete IS NULL
      WHERE c.serie = ${id}
        AND c.date_delete IS NULL
      ORDER BY c.number ASC
      LIMIT 200
    `

    const genres = series.cdb_series_genres
      .filter(sg => !sg.cdb_zhanr.date_delete)
      .map(sg => decodeHtmlEntities(sg.cdb_zhanr.name))

    // Вычисляем статус перевода исходя из даты последней публикации перевода (date)
    const translatedCount = comics.length
    const totalIssues = series.comicvine || series.total || 0
    const lastTranslationDate = comics.length > 0
      ? comics.reduce<Date | null>((latest, comic) => {
          const date = comic.date // Используем только date (дату перевода), а не pdate
          if (!date) return latest
          if (!latest) return date
          return date > latest ? date : latest
        }, comics.find(c => c.date)?.date || null)
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
      comics: comics.map((comic) => {
        const thumb = getImageUrl(comic.thumb)
        const tiny = getImageUrl(comic.tiny)

        return {
          id: comic.id,
          comicvine: comic.comicvine,
          number: Number(comic.number),
          pdate: comic.pdate,
          date: comic.date,
          thumb,
          tiny,
          site: comic.site,
          siteName: comic.site1_name ? decodeHtmlEntities(comic.site1_name) : comic.site,
          siteId: comic.site,
          site2: comic.site2,
          site2Name: comic.site2_name && comic.site2 !== '0' ? decodeHtmlEntities(comic.site2_name) : null,
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
        }
      }),
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
        {/* Хлебные крошки - только на десктопе */}
        <nav className="mb-6 text-sm hidden md:block">
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
        <div className="mb-8 md:text-left text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            {series.name}
            {series.volume && series.volume !== '0' && (
              <span className="text-xl md:text-2xl text-text-secondary ml-2">
                ({series.volume})
              </span>
            )}
          </h1>

          <div className="space-y-4 mt-6">
            {/* Основная метадата */}
            <div className="text-sm text-text-primary space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Link
                  href={`/publishers/${series.publisher.id}`}
                  className="text-text-primary hover:text-accent hover:underline transition-colors"
                >
                  {series.publisher.name}
                </Link>
                <span className="text-text-tertiary">•</span>
                <span className="text-sm font-medium text-text-primary">
                  {series.status === 'comicvine' ? 'Статус неизвестен' :
                   series.status === 'continue' ? 'Продолжается' :
                   series.status === 'finish' ? 'Завершена' :
                   series.status === 'freez' ? 'Заморожена' : series.status}
                </span>
                <span className="text-text-tertiary">•</span>
                <span className="text-sm font-medium text-text-primary">
                  {series.translationStatus}
                </span>
                <span className="text-text-tertiary">•</span>
                <span className="text-sm text-text-primary">
                  Переведено: {series.comics.length}
                  {series.comicvine > 0 && ` из ${series.comicvine}`}
                </span>
              </div>

              {/* Жанры отдельной строкой */}
              {series.genres.length > 0 && (
                <div className="pt-2 text-center md:text-left">
                  <span className="text-sm text-text-secondary">Жанры: </span>
                  <span className="text-sm">
                    {series.genres.map((genre, idx) => (
                      <span key={idx}>
                        <Link
                          href={`/search?q=${encodeURIComponent(genre)}&tab=series`}
                          className="text-text-secondary hover:text-accent hover:underline transition-colors"
                        >
                          {genre}
                        </Link>
                        {idx < series.genres.length - 1 && <span>, </span>}
                      </span>
                    ))}
                  </span>
                </div>
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

