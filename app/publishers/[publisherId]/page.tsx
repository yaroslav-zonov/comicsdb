import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SeriesListView from '@/components/SeriesListView'
import Pagination from '@/components/Pagination'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, getImageUrl } from '@/lib/utils'
import { Prisma } from '@prisma/client'

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

    if (series.length === 0) {
      return {
        id: publisher.id,
        name: decodeHtmlEntities(publisher.name),
        series: [],
        total: totalSeries,
        page,
        pageSize,
      }
    }

    // Оптимизация: получаем все обложки и количество комиксов batch запросами
    const seriesIds = series.map(s => s.id)
    
    if (seriesIds.length === 0) {
      return {
        id: publisher.id,
        name: decodeHtmlEntities(publisher.name),
        series: [],
        total: totalSeries,
        page,
        pageSize,
      }
    }
    
    // Получаем количество комиксов и обложки одним batch запросом
    const [comicsCountsRaw, firstComicsRaw] = await Promise.all([
      // Количество комиксов
      prisma.comic.groupBy({
        by: ['serieId'],
        where: {
          serieId: { in: seriesIds },
          dateDelete: null,
        },
        _count: {
          id: true,
        },
      }),
      // Первые комиксы для обложек - получаем все комиксы и фильтруем на клиенте
      (async () => {
        // Получаем все комиксы для этих серий одним запросом
        const allComics = await prisma.comic.findMany({
          where: {
            serieId: { in: seriesIds },
            dateDelete: null,
          },
          select: {
            serieId: true,
            number: true,
            thumb: true,
            tiny: true,
          },
          orderBy: {
            number: 'asc',
          },
        })
        
        // Группируем по сериям и берем первый (с минимальным номером)
        const firstComicsMap = new Map<number, { thumb: string | null; tiny: string | null }>()
        for (const comic of allComics) {
          if (!firstComicsMap.has(comic.serieId)) {
            firstComicsMap.set(comic.serieId, {
              thumb: comic.thumb,
              tiny: comic.tiny,
            })
          }
        }
        
        return Array.from(firstComicsMap.entries()).map(([serie, images]) => ({
          serie,
          ...images,
        }))
      })(),
    ])

    const countMap = new Map(comicsCountsRaw.map(c => [c.serieId, c._count.id]))
    const coverMap = new Map(firstComicsRaw.map(c => [c.serie, c.thumb || c.tiny]))

    const seriesWithData = series.map(series => ({
      ...series,
      cover: coverMap.get(series.id) || series.thumb,
      comicsCount: countMap.get(series.id) || 0,
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

