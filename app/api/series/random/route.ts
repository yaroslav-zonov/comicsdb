import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Получаем случайную серию
    const total = await prisma.series.count({
      where: {
        dateDelete: null,
      },
    })

    if (total === 0) {
      return NextResponse.json(null)
    }

    const randomSkip = Math.floor(Math.random() * total)

    const series = await prisma.series.findFirst({
      skip: randomSkip,
      where: {
        dateDelete: null,
      },
      include: {
        publisher: true,
      },
    })

    if (!series) {
      return NextResponse.json(null)
    }

    return NextResponse.json(series)
  } catch (error) {
    console.error('Error fetching random series:', error)
    return NextResponse.json(
      { error: 'Failed to fetch random series' },
      { status: 500 }
    )
  }
}

