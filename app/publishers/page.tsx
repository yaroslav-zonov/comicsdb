import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Pagination from '@/components/Pagination'
import SortSelect from '@/components/SortSelect'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities } from '@/lib/utils'

// Кешируем на 60 секунд для ускорения
export const revalidate = 60

async function getPublishers(page: number = 1, pageSize: number = 100, sort: string = 'name_asc') {
  try {
    // Сначала получаем ВСЕ издательства
    const allPublishers = await prisma.publisher.findMany({
      where: {
        dateDelete: null,
      },
    })

    const total = allPublishers.length

    // Получаем количество серий и комиксов для каждого издательства
    const publishersWithCounts = await Promise.all(
      allPublishers.map(async (publisher) => {
        const [seriesCount, comicsCount] = await Promise.all([
          prisma.series.count({
            where: {
              publisherId: publisher.id,
              dateDelete: null,
            },
          }),
          prisma.comic.count({
            where: {
              dateDelete: null,
              series: {
                publisherId: publisher.id,
                dateDelete: null,
              },
            },
          }),
        ])

        return {
          id: publisher.id,
          name: decodeHtmlEntities(publisher.name),
          seriesCount,
          comicsCount,
        }
      })
    )

    // Сортируем ВСЕ данные в зависимости от параметра
    let sorted = [...publishersWithCounts]
    if (sort === 'name_desc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name))
    } else if (sort === 'series_asc') {
      sorted.sort((a, b) => a.seriesCount - b.seriesCount)
    } else if (sort === 'series_desc') {
      sorted.sort((a, b) => b.seriesCount - a.seriesCount)
    } else if (sort === 'comics_asc') {
      sorted.sort((a, b) => a.comicsCount - b.comicsCount)
    } else if (sort === 'comics_desc') {
      sorted.sort((a, b) => b.comicsCount - a.comicsCount)
    } else {
      // name_asc
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Применяем пагинацию ПОСЛЕ сортировки
    const skip = (page - 1) * pageSize
    const paginated = sorted.slice(skip, skip + pageSize)

    return {
      publishers: paginated,
      total,
      page,
      pageSize,
    }
  } catch (error) {
    console.error('Error fetching publishers:', error)
    return { publishers: [], total: 0, page: 1, pageSize: 100 }
  }
}

export default async function PublishersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }> | { page?: string; sort?: string }
}) {
  // В Next.js 14 searchParams может быть Promise
  const resolvedParams = await Promise.resolve(searchParams)
  const page = parseInt(resolvedParams.page || '1')
  const sort = resolvedParams.sort || 'name_asc'
  const data = await getPublishers(page, 100, sort)

  const getPageLink = (pageNum: number) => {
    const params = new URLSearchParams()
    if (pageNum > 1) params.set('page', pageNum.toString())
    if (sort !== 'name_asc') params.set('sort', sort)
    const query = params.toString()
    return `/publishers${query ? `?${query}` : ''}`
  }

  const getSortLink = (newSort: string) => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page.toString())
    params.set('sort', newSort)
    return `/publishers?${params.toString()}`
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
              <li className="text-text-primary">Издательства</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-4">Издательства</h1>

          {/* Сортировка */}
          <div className="mb-6 flex items-center gap-4">
            <span className="text-sm text-text-secondary">Сортировка по:</span>
            <SortSelect
              currentSort={sort}
              options={[
                { value: 'name_asc', label: 'алфавиту (А-Я)' },
                { value: 'name_desc', label: 'алфавиту (Я-А)' },
                { value: 'series_desc', label: 'количеству серий (убывание)' },
                { value: 'series_asc', label: 'количеству серий (возрастание)' },
                { value: 'comics_desc', label: 'количеству выпусков (убывание)' },
                { value: 'comics_asc', label: 'количеству выпусков (возрастание)' },
              ]}
            />
          </div>

          {/* Список издательств */}
          {data.publishers.length === 0 ? (
            <p className="text-text-secondary">Нет доступных издательств</p>
          ) : (
            <>
              <div className="bg-bg-card rounded-lg shadow overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                  {data.publishers.map((publisher) => (
                    <li key={publisher.id}>
                      <Link
                        href={`/publishers/${publisher.id}`}
                        className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#111111] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-text-primary hover:text-accent transition-colors">
                              {publisher.name}
                            </h3>
                            <div className="text-sm text-text-secondary mt-1 space-x-3">
                              <span>{publisher.seriesCount} {publisher.seriesCount === 1 ? 'серия' : publisher.seriesCount < 5 ? 'серии' : 'серий'}</span>
                              <span>•</span>
                              <span>{publisher.comicsCount} {publisher.comicsCount === 1 ? 'выпуск' : publisher.comicsCount < 5 ? 'выпуска' : 'выпусков'}</span>
                            </div>
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

