import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeriesListView from '@/components/SeriesListView'
import Pagination from '@/components/Pagination'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, getImageUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getPublisher(id: number, page: number = 1, pageSize: number = 100) {
  try {
    const publisher = await prisma.publisher.findUnique({
      where: {
        id: id,
        dateDelete: null,
      },
    })

    if (!publisher) {
      return null
    }

    // Получаем общее количество серий
    const totalSeries = await prisma.series.count({
      where: {
        publisherId: id,
        dateDelete: null,
      },
    })

    // Получаем серии с пагинацией
    const skip = (page - 1) * pageSize
    const series = await prisma.series.findMany({
      where: {
        publisherId: id,
        dateDelete: null,
      },
      orderBy: {
        name: 'asc',
      },
      skip,
      take: pageSize,
    })

    // Получаем обложки и количество комиксов для серий
    const seriesWithData = await Promise.all(
      series.map(async (series) => {
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
          ...series,
          cover: firstComic?.thumb || firstComic?.tiny || series.thumb,
          comicsCount,
        }
      })
    )

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
  params: { publisherId: string }
  searchParams: { page?: string }
}) {
  const id = parseInt(params.publisherId)
  const page = parseInt(searchParams.page || '1')
  
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
            <ol className="flex items-center space-x-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
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

