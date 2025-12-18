import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { decodeHtmlEntities, getSeriesUrl, getImageUrl } from '@/lib/utils'

interface Series {
  id: number
  name: string
  publisher: {
    id: number
    name: string
  }
  thumb: string | null
  icon: string | null
  zhanr: string
}

async function getRandomSeries(): Promise<Series | null> {
  try {
    // Получаем серии с приоритетом законченным и ваншотам, учитывая популярность
    // Ваншоты - это серии с total = 1 или одноразовые выпуски
    // Популярность - количество отметок "читаю" (status = true в cdb_user_read_series)
    
    // Сначала получаем законченные серии и ваншоты
    const candidateSeries = await prisma.series.findMany({
      where: {
        dateDelete: null,
        OR: [
          { status: 'finish' },
          { total: 1 },
        ],
      },
      include: {
        publisher: true,
      },
      take: 100,
    })

    if (candidateSeries.length === 0) {
      // Если нет подходящих серий, берем любую случайную
      const total = await prisma.series.count({
        where: {
          dateDelete: null,
        },
      })

      if (total === 0) {
        return null
      }

      const randomSkip = Math.floor(Math.random() * total)
      const series = await prisma.series.findFirst({
        skip: randomSkip,
        where: {
          dateDelete: null,
        },
        include: {
          publisher: true,
        },
      })

      if (!series) {
        return null
      }

      return {
        id: series.id,
        name: decodeHtmlEntities(series.name),
        publisher: {
          id: series.publisher.id,
          name: decodeHtmlEntities(series.publisher.name),
        },
        thumb: getImageUrl(series.thumb),
        icon: getImageUrl(series.icon),
        zhanr: series.zhanr ? decodeHtmlEntities(String(series.zhanr)) : '',
      }
    }

    // Получаем популярность для каждой серии (количество отметок "читаю")
    // Используем raw query для подсчета, так как модель может быть недоступна напрямую
    const seriesWithPopularity = await Promise.all(
      candidateSeries.map(async (series) => {
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM cdb_user_read_series
          WHERE series = ${series.id} AND status = 1
        `
        const readCount = result[0] ? Number(result[0].count) : 0
        
        // Проверяем, есть ли описание (zhanr не пустое)
        const hasDescription = series.zhanr && series.zhanr.trim().length > 0

        return {
          series,
          popularity: readCount,
          priority: series.status === 'finish' ? 1 : series.total === 1 ? 2 : 3,
          hasDescription,
        }
      })
    )

    // Сортируем: сначала с описанием, потом по приоритету, потом по популярности
    const sortedSeries = seriesWithPopularity
      .sort((a, b) => {
        // Приоритет сериям с описанием
        if (a.hasDescription !== b.hasDescription) {
          return a.hasDescription ? -1 : 1
        }
        // Затем по статусу (законченные > ваншоты)
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // Затем по популярности
        return b.popularity - a.popularity
      })
      .slice(0, 20) // Берем топ-20

    // Фильтруем серии с описанием и популярностью
    const withDescriptionAndPopularity = sortedSeries.filter(
      item => item.hasDescription && item.popularity > 0
    )
    
    // Если есть серии с описанием и популярностью, выбираем из них
    // Иначе выбираем из всех отсортированных
    const candidates = withDescriptionAndPopularity.length > 0
      ? withDescriptionAndPopularity
      : sortedSeries.filter(item => item.hasDescription || item.popularity > 0)
    
    // Если и таких нет, берем любые отсортированные
    const finalCandidates = candidates.length > 0 ? candidates : sortedSeries

    // Выбираем случайную из топ-10
    let selected = finalCandidates[Math.floor(Math.random() * Math.min(finalCandidates.length, 10))].series

    return {
      id: selected.id,
      name: selected.name,
      publisher: {
        id: selected.publisher.id,
        name: selected.publisher.name,
      },
      thumb: getImageUrl(selected.thumb),
      icon: getImageUrl(selected.icon),
      zhanr: selected.zhanr ? String(selected.zhanr) : '',
    }
  } catch (error) {
    console.error('Error fetching random series:', error)
    return null
  }
}

export default async function RandomSeries() {
  let series: Series | null = null
  
  try {
    series = await getRandomSeries()
  } catch (error) {
    console.error('Error in RandomSeries component:', error)
  }

  if (!series) {
    return (
      <section className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-orange-950/20 dark:to-red-950/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-bg-card rounded-lg shadow-lg p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-bg-tertiary border-t-accent mb-3"></div>
            <p className="text-text-secondary">Загрузка случайной серии...</p>
          </div>
        </div>
      </section>
    )
  }

  // Обрезаем описание до 200 символов для компактности
  const description = series.zhanr && series.zhanr.trim().length > 0 
    ? (series.zhanr.trim().length > 200 ? series.zhanr.trim().substring(0, 200) + '...' : series.zhanr.trim())
    : 'Описание отсутствует'

  return (
    <section className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-orange-950/20 dark:to-red-950/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Обложка - уменьшенная высота */}
            <div className="md:w-1/4 relative aspect-[2/3] h-64 md:h-auto">
              {series.thumb && series.thumb !== '' ? (
                <Image
                  src={series.thumb}
                  alt={series.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 25vw"
                  unoptimized
                />
              ) : series.icon && series.icon !== '' ? (
                <Image
                  src={series.icon}
                  alt={series.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 25vw"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-bg-tertiary flex items-center justify-center">
                  <span className="text-text-tertiary text-sm">Нет обложки</span>
                </div>
              )}
            </div>

            {/* Информация */}
            <div className="md:w-3/4 p-4 md:p-6">
              <div className="mb-2">
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                  Случайная серия
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                <Link href={getSeriesUrl(series.publisher.id, series.id)} className="text-text-secondary hover:text-accent hover:underline transition-colors">
                  {series.name}
                </Link>
              </h2>
              
              <p className="text-text-secondary mb-3 text-sm">
                <Link href={`/publishers/${series.publisher.id}`} className="text-text-secondary hover:text-accent hover:underline transition-colors">
                  {series.publisher.name}
                </Link>
              </p>

              {/* Описание */}
              <p className="text-text-secondary text-sm line-clamp-3">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
