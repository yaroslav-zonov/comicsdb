import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')

    // Получаем комиксы, сортируя по дате перевода (date), если нет - по дате публикации (pdate)
    const comics = await prisma.comic.findMany({
      take: limit * 3, // Берем больше для правильной сортировки
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
        adddate: 'desc', // Сначала по дате добавления
      },
    })

    // Сортируем вручную: сначала по date (если есть), потом по pdate, потом по adddate
    const sortedComics = comics.sort((a, b) => {
      // Приоритет: date > pdate > adddate
      const getDate = (comic: typeof a) => {
        if (comic.date) return new Date(comic.date).getTime()
        if (comic.pdate) return new Date(comic.pdate).getTime()
        return new Date(comic.adddate).getTime()
      }
      
      const dateA = getDate(a)
      const dateB = getDate(b)
      return dateB - dateA
    })

    return NextResponse.json({
      comics: sortedComics.slice(0, limit),
    })
  } catch (error) {
    console.error('Error fetching latest comics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch latest comics' },
      { status: 500 }
    )
  }
}

