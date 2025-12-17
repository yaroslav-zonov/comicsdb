import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeriesListView from '@/components/SeriesListView'
import Pagination from '@/components/Pagination'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { decodeHtmlEntities, getImageUrl, getSeriesUrl } from '@/lib/utils'

// Кешируем на 60 секунд для ускорения
export const revalidate = 60

async function getGenre(id: number, page: number = 1, pageSize: number = 100) {
  try {
    const genre = await prisma.genre.findUnique({
      where: {
        id: id,
        date_delete: null,
      },
    })

    if (!genre) {
      return null
    }

    const skip = (page - 1) * pageSize

    // ОПТИМИЗИРОВАННЫЙ SQL: один запрос вместо N+1
    // Получаем серии с подзапросами для обложек и количества комиксов
    const results = await prisma.$queryRaw<Array<{
      id: number
      name: string
      volume: string
      thumb: string | null
      status: string
      comicvine: number
      total: number
      publisher_id: number
      publisher_name: string
      first_comic_thumb: string | null
      first_comic_tiny: string | null
      comics_count: bigint
      total_count: bigint
    }>>`
      SELECT
        s.id,
        s.name,
        s.volume,
        s.thumb,
        s.status,
        s.comicvine,
        s.total,
        p.id as publisher_id,
        p.name as publisher_name,
        (SELECT c.thumb FROM cdb_comics c
         WHERE c.serie = s.id AND c.date_delete IS NULL
         ORDER BY c.number ASC LIMIT 1) as first_comic_thumb,
        (SELECT c.tiny FROM cdb_comics c
         WHERE c.serie = s.id AND c.date_delete IS NULL
         ORDER BY c.number ASC LIMIT 1) as first_comic_tiny,
        (SELECT COUNT(*) FROM cdb_comics c
         WHERE c.serie = s.id AND c.date_delete IS NULL) as comics_count,
        COUNT(*) OVER() as total_count
      FROM cdb_series s
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      INNER JOIN cdb_series_genres sg ON s.id = sg.series_id
      WHERE sg.genre_id = ${id}
        AND s.date_delete IS NULL
      ORDER BY s.name ASC
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const total = results.length > 0 ? Number(results[0].total_count) : 0

    return {
      id: genre.id,
      name: decodeHtmlEntities(genre.name),
      series: results.map(s => ({
        id: s.id,
        name: decodeHtmlEntities(s.name),
        volume: s.volume,
        publisher: {
          id: s.publisher_id,
          name: decodeHtmlEntities(s.publisher_name),
        },
        thumb: getImageUrl(s.first_comic_thumb || s.first_comic_tiny || s.thumb),
        status: s.status,
        comicvine: s.comicvine,
        comicsCount: Number(s.comics_count),
        total: s.total,
      })),
      total,
      page,
      pageSize,
    }
  } catch (error) {
    console.error('Error fetching genre:', error)
    return null
  }
}

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: Promise<{ page?: string }> | { page?: string }
}) {
  // В Next.js 14 searchParams может быть Promise
  const resolvedParams = await Promise.resolve(searchParams)
  const id = parseInt(params.id)
  const page = parseInt(resolvedParams.page || '1')
  
  if (isNaN(id)) {
    notFound()
  }

  const genre = await getGenre(id, page, 100)

  if (!genre) {
    notFound()
  }

  const getPageLink = (pageNum: number) => {
    if (pageNum === 1) {
      return `/genres/${id}`
    }
    return `/genres/${id}?page=${pageNum}`
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
                <Link href="/genres" className="hover:text-accent transition-colors">
                  Жанры
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">{genre.name}</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">{genre.name}</h1>

          {/* Список серий */}
          {genre.series.length === 0 ? (
            <p className="text-text-secondary">Нет серий в этом жанре</p>
          ) : (
            <>
              <SeriesListView
                series={genre.series}
                title="Серии"
              />
              <Pagination
                total={genre.total}
                page={genre.page}
                pageSize={genre.pageSize}
                getPageLink={getPageLink}
              />
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

