import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const comics = await prisma.comic.findMany({
      skip,
      take: limit,
      where: {
        dateDelete: null,
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
      },
      orderBy: {
        adddate: 'desc',
      },
    })

    const total = await prisma.comic.count({
      where: {
        dateDelete: null,
      },
    })

    return NextResponse.json({
      comics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching comics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comics' },
      { status: 500 }
    )
  }
}

