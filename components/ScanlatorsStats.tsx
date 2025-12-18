import Link from 'next/link'
import NextImage from 'next/image'
import { getComicUrl } from '@/lib/utils'

type TopScanlator = {
  siteId: string
  siteName: string
  count: number
}

type TopScanlatorSite = {
  siteId: string
  siteName: string
  count: number
}

type Freshman = {
  siteId: string
  siteName: string
  firstDate: Date
  count: number
}

type MostTranslatedComic = {
  comicvine: number
  seriesName: string
  publisherName: string
  publisherId: number
  seriesId: number
  number: number
  thumb: string | null
  count: number
  year: number
} | null

type ScanlatorsStatsProps = {
  topScanlatorsByYear: { year: number; topScanlators: TopScanlator[] }
  mostTranslatedComic: MostTranslatedComic
  topSitesByYear: { year: number; topSites: TopScanlatorSite[] }
  freshmen: { year: number; freshmen: Freshman[] }
}

export default function ScanlatorsStats({
  topScanlatorsByYear,
  mostTranslatedComic,
  topSitesByYear,
  freshmen,
}: ScanlatorsStatsProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Итоги года */}
      <div className="bg-bg-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Итоги {topScanlatorsByYear.year} года — Топ 10 сканлейтеров
        </h3>
        {topScanlatorsByYear.topScanlators.length === 0 ? (
          <p className="text-text-secondary">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {topScanlatorsByYear.topScanlators.map((scanlator, i) => {
              const maxCount = topScanlatorsByYear.topScanlators[0].count
              const percentage = (scanlator.count / maxCount) * 100
              return (
                <div key={scanlator.siteId} className="flex items-center gap-4">
                  <div className="w-8 text-sm font-semibold text-text-secondary">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <Link
                        href={`/search?q=${encodeURIComponent(scanlator.siteName)}&type=scanlator&tab=scanlators`}
                        className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
                      >
                        {scanlator.siteName}
                      </Link>
                      <span className="text-sm text-text-secondary">
                        {scanlator.count.toLocaleString('ru-RU')} релизов
                      </span>
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Дубль года */}
      <div className="bg-bg-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Дубль {mostTranslatedComic?.year || new Date().getFullYear()} года
        </h3>
        {mostTranslatedComic ? (
          <div className="flex gap-4">
            {mostTranslatedComic.thumb && (
              <Link
                href={getComicUrl(mostTranslatedComic.publisherId, mostTranslatedComic.seriesId, mostTranslatedComic.comicvine)}
                className="flex-shrink-0"
              >
                <div className="relative w-24 aspect-[2/3] bg-bg-tertiary rounded overflow-hidden">
                  <NextImage
                    src={mostTranslatedComic.thumb}
                    alt={`${mostTranslatedComic.seriesName} #${mostTranslatedComic.number}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized
                  />
                </div>
              </Link>
            )}
            <div className="flex-1">
              <p className="text-text-secondary mb-2">
                Комикс с самым большим количеством переводов в {mostTranslatedComic.year} году:
              </p>
              <Link
                href={getComicUrl(mostTranslatedComic.publisherId, mostTranslatedComic.seriesId, mostTranslatedComic.comicvine)}
                className="text-lg font-semibold text-text-secondary hover:text-accent transition-colors block"
              >
                {mostTranslatedComic.seriesName} #{mostTranslatedComic.number}
              </Link>
              <p className="text-sm text-text-secondary mt-2">
                {mostTranslatedComic.count} {mostTranslatedComic.count === 1 ? 'перевод' : mostTranslatedComic.count < 5 ? 'перевода' : 'переводов'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-text-secondary">Нет данных</p>
        )}
      </div>

      {/* Команда года */}
      <div className="bg-bg-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Команда {topSitesByYear.year} года — Топ 10 сайтов
        </h3>
        {topSitesByYear.topSites.length === 0 ? (
          <p className="text-text-secondary">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {topSitesByYear.topSites.map((site, i) => {
              const maxCount = topSitesByYear.topSites[0].count
              const percentage = (site.count / maxCount) * 100
              return (
                <div key={site.siteId} className="flex items-center gap-4">
                  <div className="w-8 text-sm font-semibold text-text-secondary">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <Link
                        href={`/sites/${site.siteId}`}
                        className="text-sm font-medium text-text-primary hover:text-accent"
                      >
                        {site.siteName}
                      </Link>
                      <span className="text-sm text-text-secondary">
                        {site.count.toLocaleString('ru-RU')} релизов
                      </span>
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Фрешмены года */}
      <div className="bg-bg-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Фрешмены {freshmen.year} года
        </h3>
        {freshmen.freshmen.length === 0 ? (
          <p className="text-text-secondary">Нет данных</p>
        ) : (
          <div className="space-y-3">
            {freshmen.freshmen.map((freshman, i) => (
              <div key={freshman.siteId} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div>
                  <span className="text-sm font-medium text-text-primary">
                    {freshman.siteName}
                  </span>
                  <p className="text-xs text-text-secondary mt-1">
                    Первый релиз: {formatDate(freshman.firstDate)}
                  </p>
                </div>
                <div className="text-sm font-semibold text-accent">
                  {freshman.count.toLocaleString('ru-RU')} релизов
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

