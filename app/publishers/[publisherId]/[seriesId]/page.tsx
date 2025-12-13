import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SeriesPageContent from './SeriesPageContent'

export const dynamic = 'force-dynamic'

async function getSeries(publisherId: number, seriesId: number) {
  try {
    const series = await prisma.series.findUnique({
      where: {
        id: seriesId,
        dateDelete: null,
        publisherId: publisherId,
      },
    })

    if (!series) {
      return null
    }

    return {
      publisherId,
      seriesId,
    }
  } catch (error) {
    console.error('Error fetching series:', error)
    return null
  }
}

export default async function SeriesPage({
  params,
}: {
  params: { publisherId: string; seriesId: string }
}) {
  const publisherId = parseInt(params.publisherId)
  const seriesId = parseInt(params.seriesId)
  
  if (isNaN(publisherId) || isNaN(seriesId)) {
    notFound()
  }

  const series = await getSeries(publisherId, seriesId)

  if (!series) {
    notFound()
  }

  return <SeriesPageContent seriesId={seriesId} />
}

