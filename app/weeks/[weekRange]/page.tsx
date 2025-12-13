import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ComicsListView from '@/components/ComicsListView'
import WeekNavigation from '@/components/WeekNavigation'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, formatDate, getImageUrl } from '@/lib/utils'
import { getMetronImageUrl } from '@/lib/metron'
import { notFound } from 'next/navigation'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function parseWeekRange(weekRange: string): { start: Date; end: Date } | null {
  try {
    const [startStr, endStr] = weekRange.split('_')
    if (!startStr || !endStr) return null
    
    const [startYear, startMonth, startDay] = startStr.split('-').map(Number)
    const [endYear, endMonth, endDay] = endStr.split('-').map(Number)
    
    const start = new Date(startYear, startMonth - 1, startDay)
    const end = new Date(endYear, endMonth - 1, endDay)
    
    // Устанавливаем время на конец дня для end
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)
    
    return { start, end }
  } catch {
    return null
  }
}

function formatWeekRange(start: Date, end: Date): string {
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return `${formatDateStr(start)}_${formatDateStr(end)}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Понедельник
  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function getWeekEnd(start: Date): Date {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function getPreviousWeek(start: Date): { start: Date; end: Date } {
  const prevStart = new Date(start)
  prevStart.setDate(prevStart.getDate() - 7)
  prevStart.setHours(0, 0, 0, 0)
  const prevEnd = getWeekEnd(prevStart)
  return { start: prevStart, end: prevEnd }
}

function getNextWeek(end: Date): { start: Date; end: Date } {
  const nextStart = new Date(end)
  nextStart.setDate(nextStart.getDate() + 1)
  nextStart.setHours(0, 0, 0, 0)
  const nextEnd = getWeekEnd(nextStart)
  return { start: nextStart, end: nextEnd }
}

function getCurrentWeek(): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Понедельник
  const start = new Date(now)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function isSameWeek(week1: { start: Date; end: Date }, week2: { start: Date; end: Date }): boolean {
  return (
    week1.start.getTime() === week2.start.getTime() &&
    week1.end.getTime() === week2.end.getTime()
  )
}

function formatWeekHeader(start: Date, end: Date): string {
  const startDay = start.getDate()
  const endDay = end.getDate()
  
  const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ]
  
  const startMonth = monthNames[start.getMonth()]
  const endMonth = monthNames[end.getMonth()]
  const year = start.getFullYear()
  
  // Если неделя в одном месяце
  if (start.getMonth() === end.getMonth()) {
    return `с ${startDay} по ${endDay} ${startMonth} ${year}`
  }
  
  // Если неделя в разных месяцах
  return `с ${startDay} ${startMonth} по ${endDay} ${endMonth} ${year}`
}

async function getAvailableYears(): Promise<number[]> {
  try {
    // Получаем уникальные годы из поля adddate комиксов
    const result = await prisma.$queryRaw<Array<{ year: bigint }>>(Prisma.sql`
      SELECT DISTINCT YEAR(adddate) as year
      FROM cdb_comics
      WHERE date_delete IS NULL
        AND adddate IS NOT NULL
        AND YEAR(adddate) < 2026
      ORDER BY year ASC
    `)
    
    return result.map(row => Number(row.year))
  } catch (error) {
    console.error('Error fetching available years:', error)
    // Возвращаем годы по умолчанию в случае ошибки
    const currentYear = new Date().getFullYear()
    return Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i)
  }
}

async function getComicsForWeek(start: Date, end: Date) {
  try {
    const comics = await prisma.comic.findMany({
      where: {
        dateDelete: null,
        adddate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
      },
      orderBy: [
        { adddate: 'desc' },
        { number: 'asc' },
      ],
    })

    // Получаем названия сайтов для отображения
    const siteIds = new Set<string>()
    comics.forEach(comic => {
      if (comic.site) siteIds.add(comic.site)
      if (comic.site2 && comic.site2 !== '0') siteIds.add(comic.site2)
    })

    const sites = await prisma.site.findMany({
      where: {
        id: { in: Array.from(siteIds) },
        dateDelete: null,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const siteNameMap = new Map(sites.map(s => [s.id, s.name]))

    // Получаем изображения из Metron для всех комиксов параллельно (один запрос на комикс)
    // Передаем comicId для кеширования в БД
    const metronImagePromises = comics.map(comic => getMetronImageUrl(comic.comicvine, comic.id))
    const metronImageResults = await Promise.all(metronImagePromises)

    // Преобразуем в формат для ComicsListView
    const comicsData = comics.map((comic, index) => {
      const site1Name = siteNameMap.get(comic.site)
      const site2Name = comic.site2 && comic.site2 !== '0' ? siteNameMap.get(comic.site2) : null
      const metronImage = metronImageResults[index]
      // Используем Metron URL для всех размеров, если получен, иначе Comicvine
      // ВАЖНО: Если Metron вернул URL, используем его для ВСЕХ размеров
      const thumb = metronImage ? metronImage : getImageUrl(comic.thumb)
      const tiny = metronImage ? metronImage : getImageUrl(comic.tiny)
      
      return {
        id: comic.id,
        comicvine: comic.comicvine,
        number: Number(comic.number),
        series: {
          id: comic.series.id,
          name: decodeHtmlEntities(comic.series.name),
          publisher: {
            id: comic.series.publisher.id,
            name: decodeHtmlEntities(comic.series.publisher.name),
          },
        },
        thumb,
        tiny,
        date: comic.date,
        pdate: comic.pdate,
        adddate: comic.adddate,
        siteName: site1Name ? decodeHtmlEntities(site1Name) : comic.site,
        siteId: comic.site,
        site2Name: site2Name ? decodeHtmlEntities(site2Name) : null,
        site2Id: site2Name ? comic.site2 : null,
        link: comic.link,
        isJoint: !!site2Name,
      }
    })

    return {
      comics: comicsData,
      siteNameMap,
    }
  } catch (error) {
    console.error('Error fetching comics for week:', error)
    return { comics: [], siteNameMap: new Map() }
  }
}

export default async function WeekPage({
  params,
}: {
  params: { weekRange: string }
}) {
  const weekRange = parseWeekRange(params.weekRange)
  
  if (!weekRange) {
    notFound()
  }

  const [data, availableYears] = await Promise.all([
    getComicsForWeek(weekRange.start, weekRange.end),
    getAvailableYears(),
  ])
  
  const prevWeek = getPreviousWeek(weekRange.start)
  const nextWeek = getNextWeek(weekRange.end)
  const currentWeek = getCurrentWeek()
  const isCurrentWeekActive = isSameWeek(weekRange, currentWeek)

  // Форматируем даты для заголовка
  const weekHeader = formatWeekHeader(weekRange.start, weekRange.end)

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Хлебные крошки */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center space-x-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/comics" className="hover:text-accent transition-colors">
                  Комиксы
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">По неделям</li>
            </ol>
          </nav>

          {/* Заголовок и навигация */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              Комиксы за неделю {weekHeader}
            </h1>
            
            <WeekNavigation
              currentStart={weekRange.start}
              currentEnd={weekRange.end}
              prevWeekStart={prevWeek.start}
              prevWeekEnd={prevWeek.end}
              nextWeekStart={nextWeek.start}
              nextWeekEnd={nextWeek.end}
              isCurrentWeek={isCurrentWeekActive}
              availableYears={availableYears}
            />
          </div>

          {/* Список комиксов */}
          {data.comics.length === 0 ? (
            <p className="text-text-secondary">Нет комиксов за эту неделю</p>
          ) : (
            <ComicsListView
              comics={data.comics.map(c => ({
                id: c.id,
                comicvine: c.comicvine,
                number: c.number,
                series: c.series,
                thumb: c.thumb,
                tiny: c.tiny,
                siteName: c.siteName,
                date: c.date,
                pdate: c.pdate,
                adddate: c.adddate,
              }))}
              title="Комиксы"
              showCover={true}
              showTitle={true}
              titleMode="full"
              showPublisher={false}
              showSite={true}
              showDate={false}
              tableVariant="main"
              showTableOnMobile={false}
              groupByNumber={false}
              additionalTableData={data.comics.map(c => ({
                id: c.id,
                siteName: c.siteName,
                siteId: c.siteId,
                site2Name: c.site2Name,
                site2Id: c.site2Id,
                link: c.link,
                date: c.date,
                pdate: c.pdate,
                adddate: c.adddate,
                isJoint: c.isJoint,
              }))}
            />
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
