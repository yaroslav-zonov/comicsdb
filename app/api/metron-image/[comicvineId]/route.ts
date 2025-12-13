import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Кешируем на 7 дней, так как изображения не меняются часто
export const revalidate = 604800

/**
 * Получает изображение комикса из Metron API по comicvine ID
 * API: https://metron.cloud/docs/#/api/api_issue_list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ comicvineId: string }> | { comicvineId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const comicvineId = parseInt(resolvedParams.comicvineId)
    
    if (isNaN(comicvineId)) {
      return NextResponse.json(
        { error: 'Invalid comicvine ID' },
        { status: 400 }
      )
    }

    // Запрашиваем issue из Metron API по cv_id
    const metronResponse = await fetch(
      `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Кешируем на стороне сервера
        next: { revalidate: 604800 },
      }
    )

    if (!metronResponse.ok) {
      // Если Metron не вернул данные, возвращаем null
      return NextResponse.json(
        { image: null },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      )
    }

    const data = await metronResponse.json()
    
    // Metron возвращает массив результатов, берем первый
    if (data.results && data.results.length > 0) {
      const issue = data.results[0]
      const imageUrl = issue.image || null
      
      return NextResponse.json(
        { image: imageUrl },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
          },
        }
      )
    }

    // Если результатов нет
    return NextResponse.json(
      { image: null },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching Metron image:', error)
    return NextResponse.json(
      { image: null },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  }
}

