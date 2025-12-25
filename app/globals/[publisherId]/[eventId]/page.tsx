import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { decodeHtmlEntities, getImageUrl, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getEventDetails(publisherId: number, eventId: string) {
  try {
    // Получаем событие
    const event = await prisma.cdb_globals.findFirst({
      where: {
        id: eventId,
        publisher: publisherId,
        date_delete: null,
      },
      include: {
        cdb_publishers: true,
        cdb_globgenl: true,
      },
    })

    if (!event) {
      return null
    }

    // Получаем комиксы события
    const eventComics = await prisma.$queryRaw<Array<{
      id: number
      comics_id: string
      tiny: string
      thumb: string
      super: string
      pdate: Date
      name: string
      number: string
      order: number
      series_id: number
      series_name: string
      publisher_id: number
      publisher_name: string
      comicvine: number
    }>>`
      SELECT
        gc.id,
        gc.comics as comics_id,
        gc.tiny,
        gc.thumb,
        gc.super,
        gc.pdate,
        gc.name,
        gc.number,
        gc.order,
        s.id as series_id,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name,
        c.comicvine
      FROM cdb_globcom gc
      INNER JOIN cdb_comics c ON gc.comics = c.id
      INNER JOIN cdb_series s ON c.serie = s.id
      INNER JOIN cdb_publishers p ON s.publisher = p.id
      WHERE gc.global = ${eventId}
        AND gc.date_delete IS NULL
        AND c.date_delete IS NULL
        AND s.date_delete IS NULL
        AND p.date_delete IS NULL
      ORDER BY gc.order ASC, gc.pdate ASC
    `

    const comics = eventComics.map(comic => ({
      id: comic.id,
      comicsId: comic.comics_id,
      comicvine: comic.comicvine,
      tiny: getImageUrl(comic.tiny),
      thumb: getImageUrl(comic.thumb),
      super: getImageUrl(comic.super),
      pdate: comic.pdate,
      name: decodeHtmlEntities(comic.name),
      number: comic.number,
      order: comic.order,
      series: {
        id: comic.series_id,
        name: decodeHtmlEntities(comic.series_name),
        publisher: {
          id: comic.publisher_id,
          name: decodeHtmlEntities(comic.publisher_name),
        },
      },
    }))

    return {
      event: {
        id: event.id,
        name: decodeHtmlEntities(event.name),
        years: event.years,
        text: event.text ? decodeHtmlEntities(event.text) : null,
        chronology: event.chronology ? decodeHtmlEntities(event.chronology) : null,
        category: {
          id: event.cdb_globgenl.id,
          name: decodeHtmlEntities(event.cdb_globgenl.name),
        },
        publisher: {
          id: event.cdb_publishers.id,
          name: decodeHtmlEntities(event.cdb_publishers.name),
        },
      },
      comics,
    }
  } catch (error) {
    console.error('Error fetching event details:', error)
    return null
  }
}

export default async function EventPage({
  params,
}: {
  params: { publisherId: string; eventId: string }
}) {
  const publisherId = parseInt(params.publisherId)

  if (isNaN(publisherId)) {
    notFound()
  }

  const data = await getEventDetails(publisherId, params.eventId)

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
              <li>
                <Link
                  href={`/globals/${publisherId}`}
                  className="hover:text-accent transition-colors"
                >
                  {data.event.publisher.name}
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">{data.event.name}</li>
            </ol>
          </nav>

          {/* Заголовок и описание */}
          <div className="mb-8">
            <div className="flex items-baseline gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
                {data.event.name}
              </h1>
              {data.event.years && (
                <span className="text-lg text-text-secondary">
                  {data.event.years}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
              <Link
                href={`/publishers/${data.event.publisher.id}`}
                className="hover:text-accent transition-colors"
              >
                {data.event.publisher.name}
              </Link>
              <span>•</span>
              <span>{data.event.category.name}</span>
            </div>

            {data.event.text && (
              <p className="text-text-primary mb-4">{data.event.text}</p>
            )}

            {data.event.chronology && (
              <div className="bg-bg-secondary p-4 rounded-xl border border-border-primary">
                <h2 className="text-sm font-medium text-text-secondary mb-2">
                  Хронология
                </h2>
                <p className="text-sm text-text-primary whitespace-pre-line">
                  {data.event.chronology}
                </p>
              </div>
            )}
          </div>

          {/* Список комиксов */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Выпуски ({data.comics.length})
            </h2>

            {data.comics.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data.comics.map(comic => {
                  const coverImage = comic.super || comic.thumb || comic.tiny
                  const comicUrl = `/publishers/${comic.series.publisher.id}/${comic.series.id}/${comic.comicvine}`

                  return (
                    <Link
                      key={comic.id}
                      href={comicUrl}
                      className="group block"
                    >
                      <div className="relative aspect-[2/3] bg-bg-tertiary rounded-lg overflow-hidden mb-2 border border-border-primary group-hover:border-accent transition-colors">
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={`${comic.name} #${comic.number}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                            loading="lazy"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-text-tertiary text-xs">
                              Нет обложки
                            </span>
                          </div>
                        )}
                        {comic.order > 0 && (
                          <div className="absolute top-2 left-2 bg-accent text-white text-xs font-semibold px-2 py-1 rounded">
                            #{comic.order}
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors line-clamp-2 mb-1">
                        {comic.series.name} #{comic.number}
                      </h3>
                      <p className="text-xs text-text-secondary">
                        {formatDate(comic.pdate, { month: 'short', year: 'numeric' })}
                      </p>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-text-secondary">Комиксы не найдены</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
