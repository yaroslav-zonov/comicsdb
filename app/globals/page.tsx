import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { decodeHtmlEntities } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getPublishersWithEvents() {
  try {
    // Получаем издательства, у которых есть события
    const publishers = await prisma.$queryRaw<Array<{
      id: number
      name: string
      event_count: bigint
    }>>`
      SELECT DISTINCT
        p.id,
        p.name,
        COUNT(DISTINCT g.id) as event_count
      FROM cdb_publishers p
      INNER JOIN cdb_globals g ON p.id = g.publisher
      WHERE p.date_delete IS NULL
        AND g.date_delete IS NULL
      GROUP BY p.id, p.name
      ORDER BY p.name ASC
    `

    return publishers.map(p => ({
      id: p.id,
      name: decodeHtmlEntities(p.name),
      eventCount: Number(p.event_count),
    }))
  } catch (error) {
    console.error('Error fetching publishers with events:', error)
    return []
  }
}

export default async function GlobalsPage() {
  const publishers = await getPublishersWithEvents()

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
              <li className="text-text-primary">События</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              Глобальные события
            </h1>
            <p className="text-text-secondary">
              Кроссоверы и события по издательствам
            </p>
          </div>

          {/* Список издательств */}
          {publishers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishers.map(publisher => (
                <Link
                  key={publisher.id}
                  href={`/globals/${publisher.id}`}
                  className="block p-6 bg-bg-secondary rounded-xl border border-border-primary hover:border-accent transition-all duration-200 hover:shadow-lg group"
                >
                  <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors mb-2">
                    {publisher.name}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {publisher.eventCount} {publisher.eventCount === 1 ? 'событие' : publisher.eventCount < 5 ? 'события' : 'событий'}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary">События не найдены</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
