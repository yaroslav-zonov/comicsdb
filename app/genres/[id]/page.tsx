import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeriesListView from '@/components/SeriesListView'
import Pagination from '@/components/Pagination'
import { prisma } from '@/lib/prisma'
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

    // Получаем все серии этого жанра
    const seriesGenres = await prisma.seriesGenre.findMany({
      where: {
        genre_id: id,
      },
      include: {
        cdb_series: {
          include: {
            publisher: true,
          },
        },
      },
    })

    // Фильтруем серии с dateDelete = null
    const validSeries = seriesGenres
      .map(sg => sg.cdb_series)
      .filter(s => s && !s.dateDelete)

    const total = validSeries.length

    // Применяем пагинацию
    const skip = (page - 1) * pageSize
    const paginatedSeries = validSeries.slice(skip, skip + pageSize)

    // Получаем обложки и количество комиксов для серий
    const seriesWithData = await Promise.all(
      paginatedSeries.map(async (series) => {
        const firstComic = await prisma.comic.findFirst({
          where: {
            serieId: series.id,
            dateDelete: null,
          },
          select: {
            thumb: true,
            tiny: true,
          },
          orderBy: {
            number: 'asc',
          },
        })

        const comicsCount = await prisma.comic.count({
          where: {
            serieId: series.id,
            dateDelete: null,
          },
        })

        return {
          id: series.id,
          name: decodeHtmlEntities(series.name),
          volume: series.volume,
          publisher: {
            id: series.publisher.id,
            name: decodeHtmlEntities(series.publisher.name),
          },
          thumb: getImageUrl(firstComic?.thumb || firstComic?.tiny || series.thumb),
          status: series.status,
          comicvine: series.comicvine,
          comicsCount,
          total: series.total,
        }
      })
    )

    return {
      id: genre.id,
      name: decodeHtmlEntities(genre.name),
      series: seriesWithData,
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

