import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ComicCard, { ComicCardData } from '@/components/ComicCard'
import { decodeHtmlEntities, formatDate } from '@/lib/utils'

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

    // Получаем ВСЕ выпуски события из cdb_globcom
    // Ищем комиксы в нашей базе по ID или по ComicVine ID
    // Поле gc.comics может содержать либо ID комикса, либо ComicVine ID
    const eventComics = await prisma.$queryRaw<Array<{
      gc_id: number
      gc_name: string
      gc_number: string
      gc_order: number
      gc_tiny: string
      gc_thumb: string
      gc_super: string
      gc_pdate: Date
      comic_id: number | null
      comic_comicvine: number | null
      series_id: number | null
      series_name: string | null
      publisher_id: number | null
      publisher_name: string | null
    }>>`
      SELECT
        gc.id as gc_id,
        gc.name as gc_name,
        gc.number as gc_number,
        gc.order as gc_order,
        gc.tiny as gc_tiny,
        gc.thumb as gc_thumb,
        gc.super as gc_super,
        gc.pdate as gc_pdate,
        c.id as comic_id,
        c.comicvine as comic_comicvine,
        s.id as series_id,
        s.name as series_name,
        p.id as publisher_id,
        p.name as publisher_name
      FROM cdb_globcom gc
      LEFT JOIN cdb_comics c ON (
        gc.comics IS NOT NULL
        AND gc.comics != ''
        AND gc.comics != '0'
        AND (
          gc.comics = CAST(c.id AS CHAR)
          OR (CAST(gc.comics AS UNSIGNED) > 0 AND CAST(gc.comics AS UNSIGNED) = c.comicvine)
        )
        AND c.date_delete IS NULL
      )
      LEFT JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      LEFT JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      WHERE gc.global = ${eventId}
        AND gc.date_delete IS NULL
      ORDER BY gc.order ASC, gc.pdate ASC
    `

    const comics = eventComics.map(comic => {
      const hasTranslation = !!comic.comic_id
      const baseData = {
        id: comic.gc_id,
        name: decodeHtmlEntities(comic.gc_name),
        number: Number(comic.gc_number),
        order: comic.gc_order,
        tiny: comic.gc_tiny || null,
        thumb: comic.gc_thumb || null,
        super: comic.gc_super || null,
        pdate: comic.gc_pdate,
        hasTranslation,
      }

      // Если есть перевод, формируем данные для ComicCard
      if (hasTranslation && comic.comic_id && comic.comic_comicvine && comic.series_id && comic.series_name && comic.publisher_id && comic.publisher_name) {
        return {
          ...baseData,
          translation: {
            comicId: comic.comic_id,
            comicvine: comic.comic_comicvine,
            series: {
              id: comic.series_id,
              name: decodeHtmlEntities(comic.series_name),
              publisher: {
                id: comic.publisher_id,
                name: decodeHtmlEntities(comic.publisher_name),
              },
            },
          },
        }
      }

      // Если нет перевода, возвращаем только базовые данные
      return {
        ...baseData,
        translation: null,
      }
    })

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
              <div className="grid-cards">
                {data.comics.map(comic => {
                  // Для комиксов с переводом используем ComicCard
                  if (comic.hasTranslation && comic.translation) {
                    const cardData: ComicCardData = {
                      id: comic.translation.comicId,
                      comicvine: comic.translation.comicvine,
                      number: comic.number,
                      series: comic.translation.series,
                      thumb: comic.thumb || comic.super || null,
                      tiny: comic.tiny || null,
                      pdate: comic.pdate,
                    }

                    return (
                      <div key={comic.id} className="relative">
                        <ComicCard
                          data={cardData}
                          showCover={true}
                          showTitle={true}
                          titleMode="full"
                          showDate={true}
                        />
                        {/* Порядковый номер в событии - поверх обложки */}
                        {comic.order > 0 && (
                          <div className="absolute top-2 left-2 z-20 bg-accent text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none">
                            #{comic.order}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Для комиксов без перевода создаем обертку с маркером
                  const coverImage = comic.super || comic.thumb || comic.tiny
                  return (
                    <div key={comic.id} className="overflow-hidden group card-lift relative">
                      <div className="block cursor-default">
                        {coverImage && (
                          <div className="relative aspect-[2/3] bg-bg-tertiary overflow-hidden shadow-sm">
                            <Image
                              src={coverImage}
                              alt={`${comic.name} #${comic.number}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                              loading="lazy"
                              unoptimized
                            />
                            {/* Порядковый номер в событии */}
                            {comic.order > 0 && (
                              <div className="absolute top-2 left-2 z-10 bg-accent text-white text-xs font-semibold px-2 py-1 rounded">
                                #{comic.order}
                              </div>
                            )}
                            {/* Маркер "Нет перевода" */}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="bg-bg-primary/90 px-3 py-2 rounded-lg border border-border-primary">
                                <p className="text-xs font-medium text-text-secondary text-center">
                                  Нет перевода
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {!coverImage && (
                          <div className="relative aspect-[2/3] bg-bg-tertiary overflow-hidden shadow-sm flex items-center justify-center">
                            <span className="text-text-tertiary text-xs">Нет обложки</span>
                            {/* Порядковый номер в событии */}
                            {comic.order > 0 && (
                              <div className="absolute top-2 left-2 z-10 bg-accent text-white text-xs font-semibold px-2 py-1 rounded">
                                #{comic.order}
                              </div>
                            )}
                            {/* Маркер "Нет перевода" */}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="bg-bg-primary/90 px-3 py-2 rounded-lg border border-border-primary">
                                <p className="text-xs font-medium text-text-secondary text-center">
                                  Нет перевода
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="pt-3">
                          <h3 className="font-semibold text-sm text-text-tertiary mb-1 line-clamp-2">
                            {comic.name} #{comic.number}
                          </h3>
                          {comic.pdate && (
                            <p className="body-tiny mt-1">
                              {formatDate(comic.pdate, { month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
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
