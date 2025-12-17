import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12')))

    // ОПТИМИЗИРОВАННЫЙ SQL: сортировка на уровне БД с COALESCE
    // Загружаем только нужное количество комиксов, сортируя сразу по правильной дате
    const comics = await prisma.$queryRaw<Array<{
      id: number
      comicvine: number
      number: string
      name: string
      date: Date | null
      pdate: Date | null
      adddate: Date | null
      thumb: string | null
      serie: number
      series_name: string
      series_id: number
      publisher_name: string
      publisher_id: number
    }>>`
      SELECT
        c.id,
        c.comicvine,
        c.number,
        c.name,
        c.date,
        c.pdate,
        c.adddate,
        c.thumb,
        c.serie,
        s.name as series_name,
        s.id as series_id,
        p.name as publisher_name,
        p.id as publisher_id
      FROM cdb_comics c
      INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
      INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
      WHERE c.date_delete IS NULL
      ORDER BY COALESCE(c.date, c.pdate, c.adddate) DESC
      LIMIT ${limit}
    `

    // Преобразуем результат в формат, ожидаемый клиентом
    const formattedComics = comics.map(comic => ({
      id: comic.id,
      comicvine: comic.comicvine,
      number: Number(comic.number),
      name: comic.name,
      date: comic.date,
      pdate: comic.pdate,
      adddate: comic.adddate,
      thumb: comic.thumb,
      serie: comic.serie,
      series: {
        id: comic.series_id,
        name: comic.series_name,
        publisher: {
          id: comic.publisher_id,
          name: comic.publisher_name,
        },
      },
    }))

    return NextResponse.json({
      comics: formattedComics,
    })
  } catch (error) {
    console.error('Error fetching latest comics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch latest comics' },
      { status: 500 }
    )
  }
}

