import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeriesListView from '@/components/SeriesListView'
import Pagination from '@/components/Pagination'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { decodeHtmlEntities, getImageUrl } from '@/lib/utils'

// Кешируем на 60 секунд для ускорения
export const revalidate = 60

async function getPublisher(id: number, page: number = 1, pageSize: number = 100) {
  try {
    const [publisher, totalSeries] = await Promise.all([
      prisma.publisher.findUnique({
        where: {
          id: id,
          dateDelete: null,
        },
      }),
      prisma.series.count({
        where: {
          publisherId: id,
          dateDelete: null,
        },
      }),
    ])

    if (!publisher) {
      return null
    }

    const skip = (page - 1) * pageSize

    // ОПТИМИЗИРОВАННЫЙ SQL: один запрос с подзапросами вместо batch запросов
    const results = await prisma.$queryRaw<Array<{
      id: number
      name: string
      volume: string
      thumb: string | null
      status: string
      comicvine: number
      total: number
      first_comic_thumb: string | null
      first_comic_tiny: string | null
      comics_count: bigint
    }>>`
      SELECT
        s.id,
        s.name,
        s.volume,
        s.thumb,
        s.status,
        s.comicvine,
        s.total,
        (SELECT c.thumb FROM cdb_comics c
         WHERE c.serie = s.id AND c.date_delete IS NULL
         ORDER BY c.number ASC LIMIT 1) as first_comic_thumb,
        (SELECT c.tiny FROM cdb_comics c
         WHERE c.serie = s.id AND c.date_delete IS NULL
         ORDER BY c.number ASC LIMIT 1) as first_comic_tiny,
        (SELECT COUNT(*) FROM cdb_comics c
         WHERE c.serie = s.id AND c.date_delete IS NULL) as comics_count
      FROM cdb_series s
      WHERE s.publisher = ${id}
        AND s.date_delete IS NULL
      ORDER BY s.name ASC
      LIMIT ${pageSize}
      OFFSET ${skip}
    `

    const seriesWithData = results.map(s => ({
      id: s.id,
      name: s.name,
      volume: s.volume,
      thumb: s.thumb,
      status: s.status,
      comicvine: s.comicvine,
      total: s.total,
      cover: s.first_comic_thumb || s.first_comic_tiny || s.thumb,
      comicsCount: Number(s.comics_count),
    }))

    return {
      id: publisher.id,
      name: decodeHtmlEntities(publisher.name),
      series: seriesWithData.map(s => ({
        id: s.id,
        name: decodeHtmlEntities(s.name),
        volume: s.volume,
        thumb: getImageUrl(s.cover),
        status: s.status,
        comicvine: s.comicvine,
        comicsCount: s.comicsCount,
        total: s.total,
        publisher: {
          id: publisher.id,
          name: decodeHtmlEntities(publisher.name),
        },
      })),
      total: totalSeries,
      page,
      pageSize,
    }
  } catch (error) {
    console.error('Error fetching publisher:', error)
    return null
  }
}

export default async function PublisherPage({
  params,
  searchParams,
}: {
  params: Promise<{ publisherId: string }> | { publisherId: string }
  searchParams: Promise<{ page?: string }> | { page?: string }
}) {
  // В Next.js 14 params и searchParams могут быть Promise
  const resolvedParams = await Promise.resolve(params)
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const id = parseInt(resolvedParams.publisherId)
  const page = parseInt(resolvedSearchParams.page || '1')
  
  if (isNaN(id)) {
    notFound()
  }

  const publisher = await getPublisher(id, page, 100)

  if (!publisher) {
    notFound()
  }

  const getPageLink = (pageNum: number) => {
    if (pageNum === 1) {
      return `/publishers/${id}`
    }
    return `/publishers/${id}?page=${pageNum}`
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Хлебные крошки */}
          <nav className="mb-6 text-sm">
            {/* Десктопная версия - полные крошки */}
            <ol className="hidden md:flex items-center space-x-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">{publisher.name}</li>
            </ol>
            {/* Мобильная версия - только название */}
            <ol className="md:hidden flex items-center space-x-2 text-text-secondary">
              <li className="text-text-primary">{publisher.name}</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">{publisher.name}</h1>

          {/* Список серий */}
          {publisher.series.length === 0 ? (
            <p className="text-text-secondary">Нет серий для этого издательства</p>
          ) : (
            <>
              <SeriesListView
                series={publisher.series}
                title="Серии"
              />
              <Pagination
                total={publisher.total}
                page={publisher.page}
                pageSize={publisher.pageSize}
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

