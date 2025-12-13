import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const publisherId = searchParams.get('publisher')

    const where: any = {
      dateDelete: null,
    }

    if (publisherId) {
      where.publisherId = parseInt(publisherId)
    }

    const series = await prisma.series.findMany({
      skip,
      take: limit,
      where,
      include: {
        publisher: true,
        _count: {
          select: { comics: true },
        },
      },
      orderBy: {
        updated: 'desc',
      },
    })

    const total = await prisma.series.count({ where })

    return NextResponse.json({
      series,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    )
  }
}

