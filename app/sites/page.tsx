import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Pagination from '@/components/Pagination'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, formatDate } from '@/lib/utils'

// Кешируем на 60 секунд для ускорения
export const revalidate = 60

async function getSites(page: number = 1, pageSize: number = 100) {
  try {
    const skip = (page - 1) * pageSize
    
    const [sites, total] = await Promise.all([
      prisma.site.findMany({
        where: {
          dateDelete: null,
          hidesite: false,
        },
        orderBy: {
          name: 'asc',
        },
        skip,
        take: pageSize,
      }),
      prisma.site.count({
        where: {
          dateDelete: null,
          hidesite: false,
        },
      }),
    ])

    return {
      sites: sites.map(site => ({
        id: site.id,
        name: decodeHtmlEntities(site.name),
        url: site.url,
        numofcoms: Number(site.numofcoms) || 0,
      })),
      total,
      page,
      pageSize,
    }
  } catch (error) {
    console.error('Error fetching sites:', error)
    return { sites: [], total: 0, page: 1, pageSize: 100 }
  }
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }> | { page?: string }
}) {
  // В Next.js 14 searchParams может быть Promise
  const resolvedParams = await Promise.resolve(searchParams)
  const page = parseInt(resolvedParams.page || '1')
  const data = await getSites(page, 100)

  const getPageLink = (pageNum: number) => {
    if (pageNum === 1) {
      return '/sites'
    }
    return `/sites?page=${pageNum}`
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
              <li className="text-text-primary">Сайты переводчиков</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">Сайты переводчиков</h1>

          {/* Список сайтов */}
          {data.sites.length === 0 ? (
            <p className="text-text-secondary">Нет доступных сайтов</p>
          ) : (
            <>
              <div className="card overflow-hidden">
                <ul className="list-divider">
                  {data.sites.map((site) => (
                    <li key={site.id}>
                      <Link
                        href={`/sites/${site.id}`}
                        className="block list-item"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-text-primary hover:text-accent transition-colors">
                              {site.name}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-secondary">
                              <span>{site.numofcoms} {site.numofcoms === 1 ? 'комикс' : site.numofcoms < 5 ? 'комикса' : 'комиксов'}</span>
                            </div>
                            {site.url && (
                              <a
                                href={site.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-text-secondary hover:text-accent transition-colors mt-1 inline-block"
                              >
                                {site.url}
                              </a>
                            )}
                          </div>
                          <svg
                            className="w-5 h-5 text-text-tertiary ml-4"
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

