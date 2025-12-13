import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const publishers = await prisma.publisher.findMany({
      where: {
        dateDelete: null,
      },
      include: {
        _count: {
          select: { series: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ publishers })
  } catch (error) {
    console.error('Error fetching publishers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch publishers' },
      { status: 500 }
    )
  }
}

