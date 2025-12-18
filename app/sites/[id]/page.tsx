import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SiteSeriesView from './SiteSeriesView'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, formatDate } from '@/lib/utils'

// Кэшируем на 2 минуты (данные сайтов меняются реже)
export const revalidate = 120

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

    // ОПТИМИЗИРОВАННЫЙ SQL: один запрос вместо N+1
    // Получаем все данные о сериях и комиксах за один запрос с JSON агрегацией
    const seriesResults = await prisma.$queryRaw<Array<{
      series_id: number
      series_name: string
      publisher_id: number
      publisher_name: string
      series_thumb: string | null
      first_comic_thumb: string | null
      first_comic_tiny: string | null
      last_date: Date | null
      comics_json: string // JSON array комиксов
    }>>`
      SELECT
        s.id as series_id,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        s.thumb as series_thumb,
        (SELECT c2.thumb FROM cdb_comics c2
         WHERE c2.serie = s.id AND c2.date_delete IS NULL
           AND (c2.site = ${id} OR c2.site2 = ${id})
         ORDER BY c2.number ASC LIMIT 1) as first_comic_thumb,
        (SELECT c2.tiny FROM cdb_comics c2
         WHERE c2.serie = s.id AND c2.date_delete IS NULL
           AND (c2.site = ${id} OR c2.site2 = ${id})
         ORDER BY c2.number ASC LIMIT 1) as first_comic_tiny,
        MAX(COALESCE(c.date, c.pdate, c.adddate)) as last_date,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', c.id,
            'comicvine', c.comicvine,
            'number', c.number,
            'date', CASE WHEN c.date = '0000-00-00' OR YEAR(c.date) = 0 THEN NULL ELSE c.date END,
            'pdate', CASE WHEN c.pdate = '0000-00-00' OR YEAR(c.pdate) = 0 THEN NULL ELSE c.pdate END
          )
        ) as comics_json
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      WHERE c.date_delete IS NULL
        AND (c.site = ${id} OR c.site2 = ${id})
      GROUP BY s.id, s.name, p.id, p.name, s.thumb
      ORDER BY last_date DESC
    `

    // Парсим JSON данные о комиксах
    const seriesWithComics = seriesResults.map((seriesData) => {
      const comicsData = JSON.parse(seriesData.comics_json) as Array<{
        id: number
        comicvine: number
        number: string
        date: string | null
        pdate: string | null
      }>

      // Сортируем комиксы по номеру (так как JSON_ARRAYAGG не гарантирует порядок)
      const sortedComics = comicsData.sort((a, b) => Number(a.number) - Number(b.number))

      return {
        id: seriesData.series_id,
        name: decodeHtmlEntities(seriesData.series_name),
        publisher: {
          id: seriesData.publisher_id,
          name: decodeHtmlEntities(seriesData.publisher_name),
        },
        comics: sortedComics.map(c => ({
          id: c.id,
          comicvine: c.comicvine,
          number: Number(c.number),
          date: c.date ? new Date(c.date) : null,
          pdate: c.pdate ? new Date(c.pdate) : null,
        })),
        lastDate: seriesData.last_date,
        thumb: seriesData.first_comic_thumb || seriesData.first_comic_tiny || seriesData.series_thumb,
      }
    })

    // Получаем общую статистику
    const stats = await prisma.$queryRaw<Array<{
      total_comics: bigint
      first_release: Date | null
      last_release: Date | null
    }>>`
      SELECT
        COUNT(*) as total_comics,
        MIN(COALESCE(c.date, c.pdate, c.adddate)) as first_release,
        MAX(COALESCE(c.date, c.pdate, c.adddate)) as last_release
      FROM cdb_comics c
      WHERE c.date_delete IS NULL
        AND (c.site = ${id} OR c.site2 = ${id})
    `

    const totalComics = stats[0] ? Number(stats[0].total_comics) : 0
    const firstRelease = stats[0]?.first_release || null
    const lastRelease = stats[0]?.last_release || null

    return {
      id: site.id,
      name: decodeHtmlEntities(site.name),
      url: site.url,
      totalComics,
      firstRelease,
      lastRelease,
      series: seriesWithComics,
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
