import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SeriesPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  
  if (isNaN(id)) {
    notFound()
  }

  // Получаем серию для редиректа
  const series = await prisma.series.findUnique({
    where: {
      id: id,
      dateDelete: null,
    },
    select: {
      publisherId: true,
    },
  })

  if (!series) {
    notFound()
  }

  // Редирект на новый URL
  redirect(`/publishers/${series.publisherId}/${id}`)
}

