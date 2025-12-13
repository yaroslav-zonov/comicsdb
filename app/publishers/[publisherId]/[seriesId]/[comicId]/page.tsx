import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getMetronImageUrl } from '@/lib/metron'
import { getImageUrl } from '@/lib/utils'
import ComicPageContent from './ComicPageContent'

export const dynamic = 'force-dynamic'

async function getComic(comicvineId: number, publisherId: number, seriesId: number) {
  try {
    // Ищем первый комикс с указанным comicvine ID для получения основной информации
    const firstComic = await prisma.comic.findFirst({
      where: {
        comicvine: comicvineId,
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

    if (!firstComic) {
      return null
    }

    // Проверяем соответствие параметров
    if (firstComic.series.publisher.id !== publisherId || firstComic.series.id !== seriesId) {
      return null
    }

    // Получаем все переводы этого комикса (все комиксы с таким же comicvine ID)
    const allTranslations = await prisma.comic.findMany({
      where: {
        comicvine: comicvineId,
        dateDelete: null,
      },
      orderBy: {
        adddate: 'desc',
      },
    })

    // Получаем все уникальные номера выпусков серии для навигации
    // Используем comicvine ID для навигации
    const allIssuesByNumber = await prisma.$queryRaw<Array<{
      number: number
      comicvine: number
    }>>(Prisma.sql`
      SELECT DISTINCT c.number, MIN(c.comicvine) as comicvine
      FROM cdb_comics c
      WHERE c.serie = ${firstComic.serieId}
        AND c.date_delete IS NULL
      GROUP BY c.number
      ORDER BY c.number ASC
    `)

    const currentIssueIndex = allIssuesByNumber.findIndex(issue => Number(issue.comicvine) === comicvineId)
    const prevIssue = currentIssueIndex > 0 ? allIssuesByNumber[currentIssueIndex - 1] : null
    const nextIssue = currentIssueIndex < allIssuesByNumber.length - 1 ? allIssuesByNumber[currentIssueIndex + 1] : null

    // Получаем все сайты
    const siteIds = [...new Set(allTranslations.flatMap(c => [c.site, c.site2].filter((s: string) => s && s !== '0')))]
    const sites = siteIds.length > 0 ? await prisma.site.findMany({
      where: {
        id: { in: siteIds },
        dateDelete: null,
      },
      select: {
        id: true,
        name: true,
        url: true,
      },
    }) : []
    const siteMap = new Map(sites.map(s => [s.id, { name: s.name, url: s.url }]))

    // Формируем список всех переводов
    const { decodeHtmlEntities } = await import('@/lib/utils')
    const translations: Array<{
      id: number
      siteName: string
      siteId: string
      site2Name?: string | null
      site2Id?: string | null
      link: string
      translate: string
      edit: string
      date: Date | null
      isJoint: boolean
    }> = []
    
    allTranslations.forEach(t => {
      const site1 = siteMap.get(t.site)
      const site2 = t.site2 && t.site2 !== '0' ? siteMap.get(t.site2) : null
      
      if (site1 && t.link) {
        translations.push({
          id: t.id,
          siteName: decodeHtmlEntities(site1.name),
          siteId: t.site,
          site2Name: site2 ? decodeHtmlEntities(site2.name) : null,
          site2Id: site2 ? t.site2 : null,
          link: t.link,
          translate: decodeHtmlEntities(t.translate),
          edit: decodeHtmlEntities(t.edit),
          date: t.date,
          isJoint: !!site2,
        })
      }
      
      // Если есть второй сайт, но нет первого, или это отдельный перевод
      if (site2 && t.link2 && (!site1 || !t.link)) {
        translations.push({
          id: t.id + 1000000,
          siteName: decodeHtmlEntities(site2.name),
          siteId: t.site2,
          link: t.link2,
          translate: decodeHtmlEntities(t.translate),
          edit: decodeHtmlEntities(t.edit),
          date: t.date,
          isJoint: false,
        })
      }
    })

    // Используем первый комикс для основной информации
    const mainComic = allTranslations[0] || firstComic

    // Получаем изображение из Metron (один запрос для всех размеров)
    const metronImageUrl = await getMetronImageUrl(firstComic.comicvine)
    
    // Используем Metron URL для всех размеров, если получен, иначе Comicvine
    const thumb = metronImageUrl || getImageUrl(mainComic.thumb)
    const tiny = metronImageUrl || getImageUrl(mainComic.tiny)
    const small = metronImageUrl || getImageUrl(mainComic.small)
    const superImage = metronImageUrl || getImageUrl(mainComic.super)

    return {
      id: mainComic.id,
      comicvine: firstComic.comicvine,
      number: Number(mainComic.number),
      pdate: mainComic.pdate,
      date: mainComic.date,
      series: {
        id: firstComic.series.id,
        name: decodeHtmlEntities(firstComic.series.name),
        publisher: {
          id: firstComic.series.publisher.id,
          name: decodeHtmlEntities(firstComic.series.publisher.name),
        },
      },
      thumb,
      tiny,
      small,
      super: superImage,
      translate: decodeHtmlEntities(mainComic.translate),
      edit: decodeHtmlEntities(mainComic.edit),
      creators: decodeHtmlEntities(mainComic.creators),
      characters: decodeHtmlEntities(mainComic.characters),
      teams: decodeHtmlEntities(mainComic.teams),
      adddate: mainComic.adddate,
      translations,
      prevIssue: prevIssue ? { comicvine: Number(prevIssue.comicvine), number: Number(prevIssue.number) } : null,
      nextIssue: nextIssue ? { comicvine: Number(nextIssue.comicvine), number: Number(nextIssue.number) } : null,
    }
  } catch (error) {
    console.error('Error fetching comic:', error)
    return null
  }
}

export default async function ComicPage({
  params,
}: {
  params: { publisherId: string; seriesId: string; comicId: string }
}) {
  const comicvineId = parseInt(params.comicId) // comicId в URL - это comicvine ID
  const publisherId = parseInt(params.publisherId)
  const seriesId = parseInt(params.seriesId)
  
  if (isNaN(comicvineId) || isNaN(publisherId) || isNaN(seriesId)) {
    notFound()
  }

  const comic = await getComic(comicvineId, publisherId, seriesId)

  if (!comic) {
    notFound()
  }

  return <ComicPageContent comic={comic} />
}

