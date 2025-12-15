import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Pagination from '@/components/Pagination'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities } from '@/lib/utils'

// Кешируем на 60 секунд для ускорения
export const revalidate = 60

async function getGenres(page: number = 1, pageSize: number = 100) {
  try {
    const skip = (page - 1) * pageSize

    const [genres, total] = await Promise.all([
      prisma.genre.findMany({
        where: {
          date_delete: null,
        },
        orderBy: {
          name: 'asc',
        },
        skip,
        take: pageSize,
      }),
      prisma.genre.count({
        where: {
          date_delete: null,
        },
      }),
    ])

    // Получаем ID жанров для текущей страницы
    const genreIds = genres.map(g => g.id)

    // Один запрос для подсчёта серий для всех жанров
    const seriesCounts = await prisma.seriesGenre.groupBy({
      by: ['genre_id'],
      where: {
        genre_id: { in: genreIds },
        cdb_series: {
          dateDelete: null,
        },
      },
      _count: {
        genre_id: true,
      },
    })

    // Создаём Map для быстрого доступа
    const countsMap = new Map(
      seriesCounts.map(item => [item.genre_id, item._count.genre_id])
    )

    // Формируем результат
    const genresWithCounts = genres.map(genre => ({
      id: genre.id,
      name: decodeHtmlEntities(genre.name),
      seriesCount: countsMap.get(genre.id) || 0,
    }))

    return {
      genres: genresWithCounts,
      total,
      page,
      pageSize,
    }
  } catch (error) {
    console.error('Error fetching genres:', error)
    return { genres: [], total: 0, page: 1, pageSize: 100 }
  }
}

export default async function GenresPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = parseInt(searchParams.page || '1')
  const data = await getGenres(page, 100)

  const getPageLink = (pageNum: number) => {
    if (pageNum === 1) {
      return '/genres'
    }
    return `/genres?page=${pageNum}`
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
              <li className="text-text-primary">Жанры</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">Жанры</h1>

          {/* Список жанров */}
          {data.genres.length === 0 ? (
            <p className="text-text-secondary">Нет доступных жанров</p>
          ) : (
            <>
              <div className="card overflow-hidden">
                <ul className="list-divider">
                  {data.genres.map((genre) => (
                    <li key={genre.id}>
                      <Link
                        href={`/genres/${genre.id}`}
                        className="block list-item"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-text-primary hover:text-accent transition-colors">
                              {genre.name}
                            </h3>
                            <p className="text-sm text-text-secondary mt-1">
                              {genre.seriesCount} {genre.seriesCount === 1 ? 'серия' : genre.seriesCount < 5 ? 'серии' : 'серий'}
                            </p>
                          </div>
                          <svg
                            className="w-5 h-5 text-text-tertiary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <Pagination
                total={data.total}
                page={data.page}
                pageSize={data.pageSize}
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

