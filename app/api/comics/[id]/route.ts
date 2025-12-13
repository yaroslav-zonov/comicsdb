import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMetronImageUrl } from '@/lib/metron'
import { getImageUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid comic ID' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: 'Comic not found' },
        { status: 404 }
      )
    }

    // Получаем название сайта
    let siteName = comic.site
    if (comic.site) {
      const site = await prisma.site.findUnique({
        where: {
          id: comic.site,
        },
        select: {
          name: true,
        },
      })
      if (site) {
        siteName = site.name
      }
    }

    // Получаем название второго сайта, если есть
    let site2Name = null
    if (comic.site2 && comic.site2 !== '0') {
      const site2 = await prisma.site.findUnique({
        where: {
          id: comic.site2,
        },
        select: {
          name: true,
        },
      })
      if (site2) {
        site2Name = site2.name
      }
    }

    // Получаем изображение из Metron (один запрос для всех размеров)
    // Передаем comicId для кеширования в БД
    const metronImageUrl = await getMetronImageUrl(comic.comicvine, comic.id)
    
    // Используем Metron URL для всех размеров, если получен, иначе Comicvine
    // ВАЖНО: Если Metron вернул URL, используем его для ВСЕХ размеров
    const thumb = metronImageUrl ? metronImageUrl : getImageUrl(comic.thumb)
    const tiny = metronImageUrl ? metronImageUrl : getImageUrl(comic.tiny)
    const small = metronImageUrl ? metronImageUrl : getImageUrl(comic.small)
    const superImage = metronImageUrl ? metronImageUrl : getImageUrl(comic.super)

    return NextResponse.json({
      id: comic.id,
      number: Number(comic.number),
      pdate: comic.pdate,
      date: comic.date,
      series: {
        id: comic.series.id,
        name: comic.series.name,
        publisher: {
          id: comic.series.publisher.id,
          name: comic.series.publisher.name,
        },
      },
      thumb,
      tiny,
      small,
      super: superImage,
      translate: comic.translate,
      edit: comic.edit,
      site: comic.site,
      siteName: siteName,
      site2: comic.site2,
      site2Name: site2Name,
      link: comic.link,
      link2: comic.link2,
      creators: comic.creators,
      characters: comic.characters,
      teams: comic.teams,
      adddate: comic.adddate,
    })
  } catch (error) {
    console.error('Error fetching comic:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

