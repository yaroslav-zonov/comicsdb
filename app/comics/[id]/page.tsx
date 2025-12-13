import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Редирект со старого URL формата /comics/[id] на новый /publishers/[publisherId]/[seriesId]/[comicId]
 * Старый формат использует ID перевода, новый - comicvine ID
 */
async function getComicForRedirect(id: number) {
  try {
    const comic = await prisma.comic.findUnique({
      where: {
        id: id,
        dateDelete: null,
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
      },
    })

    if (!comic) {
      return null
    }

    return {
      comicvine: comic.comicvine,
      publisherId: comic.series.publisher.id,
      seriesId: comic.series.id,
    }
  } catch (error) {
    console.error('Error fetching comic:', error)
    return null
  }
}

export default async function ComicPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  
  if (isNaN(id)) {
    notFound()
  }

  const comic = await getComicForRedirect(id)

  if (!comic) {
    notFound()
  }

  // Редирект на новый URL формат
  redirect(`/publishers/${comic.publisherId}/${comic.seriesId}/${comic.comicvine}`)
}

