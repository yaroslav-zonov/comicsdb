import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getLatestComics(limit: number = 50) {
  try {
    const comics = await prisma.comic.findMany({
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
      take: limit,
    })

    return comics.map(comic => ({
      id: comic.id,
      comicvine: comic.comicvine,
      number: comic.number,
      series: {
        id: comic.series.id,
        name: decodeHtmlEntities(comic.series.name),
        publisher: {
          id: comic.series.publisher.id,
          name: decodeHtmlEntities(comic.series.publisher.name),
        },
      },
      adddate: comic.adddate,
      link: comic.link,
      site: comic.site,
    }))
  } catch (error) {
    console.error('Error fetching latest comics:', error)
    return []
  }
}

export default async function RSSPage() {
  const comics = await getLatestComics(50)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const siteUrl = `${baseUrl}`
  const feedUrl = `${baseUrl}/rss`

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ComicsDB - База русских переводов комиксов</title>
    <link>${siteUrl}</link>
    <description>RSS лента новых переводов комиксов</description>
    <language>ru-RU</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    ${comics.map(comic => {
      const title = `${comic.series.name} #${comic.number}`
      const link = comic.link || `${siteUrl}/publishers/${comic.series.publisher.id}/${comic.series.id}/${comic.comicvine}`
      const pubDate = comic.adddate ? new Date(comic.adddate).toUTCString() : new Date().toUTCString()
      const description = `Новый перевод: ${title} (${comic.series.publisher.name})${comic.site ? ` от ${decodeHtmlEntities(comic.site)}` : ''}`
      
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
    </item>`
    }).join('\n')}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

