import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { decodeHtmlEntities } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type EventItem = {
  id: string
  name: string
  years: string | null
  text: string | null
  order: number | null
}

async function getPublisherEvents(publisherId: number) {
  try {
    // Получаем издательство
    const publisher = await prisma.publisher.findFirst({
      where: {
        id: publisherId,
        dateDelete: null,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!publisher) {
      return null
    }

    // Получаем категории событий (genres) с событиями
    const eventCategories = await prisma.$queryRaw<Array<{
      genl_id: number
      genl_name: string
      events: string // JSON string
    }>>`
      SELECT
        gl.id as genl_id,
        gl.name as genl_name,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', g.id,
            'name', g.name,
            'years', g.years,
            'text', g.text,
            'order', g.order
          )
        ) as events
      FROM cdb_globgenl gl
      INNER JOIN cdb_globals g ON gl.id = g.genl
      WHERE gl.publisher = ${publisherId}
        AND gl.date_delete IS NULL
        AND g.date_delete IS NULL
      GROUP BY gl.id, gl.name
      ORDER BY gl.name ASC
    `

    const categories = eventCategories.map(cat => ({
      id: cat.genl_id,
      name: decodeHtmlEntities(cat.genl_name),
      events: (typeof cat.events === 'string' ? JSON.parse(cat.events) : cat.events)
        .filter((e: EventItem) => e.id && e.name)
        .map((e: EventItem) => ({
          id: e.id,
          name: decodeHtmlEntities(e.name),
          years: e.years,
          text: e.text ? decodeHtmlEntities(e.text) : null,
          order: e.order,
        }))
        .sort((a: { order: number | null }, b: { order: number | null }) => (a.order || 0) - (b.order || 0)),
    }))

    return {
      publisher: {
        id: publisher.id,
        name: decodeHtmlEntities(publisher.name),
      },
      categories,
    }
  } catch (error) {
    console.error('Error fetching publisher events:', error)
    return null
  }
}

export default async function PublisherEventsPage({
  params,
}: {
  params: { publisherId: string }
}) {
  const publisherId = parseInt(params.publisherId)

  if (isNaN(publisherId)) {
    notFound()
  }

  const data = await getPublisherEvents(publisherId)

  if (!data) {
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
                <Link href="/globals" className="hover:text-accent transition-colors">
                  События
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">{data.publisher.name}</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              События {data.publisher.name}
            </h1>
          </div>

          {/* Категории событий */}
          {data.categories.length > 0 ? (
            <div className="space-y-8">
              {data.categories.map(category => (
                <div key={category.id}>
                  <h2 className="text-xl font-semibold text-text-primary mb-4 border-b border-border-primary pb-2">
                    {category.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.events.map((event: { id: string; name: string; years: string | null; text: string | null }) => (
                      <Link
                        key={event.id}
                        href={`/globals/${publisherId}/${event.id}`}
                        className="block p-4 bg-bg-secondary rounded-xl border border-border-primary hover:border-accent transition-all duration-200 hover:shadow-lg group"
                      >
                        <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors mb-2">
                          {event.name}
                        </h3>
                        {event.years && (
                          <p className="text-sm text-text-secondary mb-1">
                            {event.years}
                          </p>
                        )}
                        {event.text && (
                          <p className="text-sm text-text-tertiary line-clamp-2">
                            {event.text}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
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
