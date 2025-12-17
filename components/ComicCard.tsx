import Link from 'next/link'
import Image from 'next/image'
import { getComicUrl, formatDate } from '@/lib/utils'

export type ComicCardData = {
  id: number
  comicvine: number
  number: number
  series: {
    id: number
    name: string
    publisher: {
      id: number
      name: string
    }
  }
  thumb?: string | null
  tiny?: string | null
  siteName?: string | null
  site2Name?: string | null
  date?: Date | null
  pdate?: Date | null
}

export type ComicCardProps = {
  data: ComicCardData
  showCover?: boolean
  showTitle?: boolean
  titleMode?: 'number-only' | 'full' // 'number-only' для страницы серии, 'full' для остальных случаев
  showPublisher?: boolean
  showSite?: boolean
  showDate?: boolean
  coverAspectRatio?: '2/3' | 'auto'
  className?: string
}

export default function ComicCard({
  data,
  showCover = true,
  showTitle = true,
  titleMode = 'full',
  showPublisher = false,
  showSite = false,
  showDate = false,
  coverAspectRatio = '2/3',
  className = '',
}: ComicCardProps) {
  const releaseDate = data.date || data.pdate
  // Для карточек используем большой размер: thumb (приоритет) > tiny (fallback)
  const comicvineUrl = data.thumb || data.tiny

  return (
    <div className={`overflow-hidden group ${className}`}>
      <Link
        href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}
        className="block"
      >
        {showCover && (
          <div className={`relative ${coverAspectRatio === '2/3' ? 'aspect-[2/3]' : ''} bg-bg-tertiary overflow-hidden shadow-sm group-hover:shadow-lg transition-shadow duration-300`}>
            {comicvineUrl ? (
              <>
                <Image
                  src={comicvineUrl}
                  alt={`${data.series.name} #${data.number}`}
                  fill={coverAspectRatio === '2/3'}
                  width={coverAspectRatio !== '2/3' ? 200 : undefined}
                  height={coverAspectRatio !== '2/3' ? 300 : undefined}
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  loading="lazy"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-text-tertiary text-xs">Нет обложки</span>
              </div>
            )}
          </div>
        )}

        {(showTitle || showPublisher || showSite || showDate) && (
          <div className="pt-3">
            {showTitle && (
              <h3 className="font-semibold text-sm text-text-primary mb-1 line-clamp-2 group-hover:text-accent transition-colors duration-200">
                {titleMode === 'number-only'
                  ? `#${data.number}`
                  : `${data.series.name} #${data.number}`}
              </h3>
            )}
            {showPublisher && (
              <a
                href={`/publishers/${data.series.publisher.id}`}
                className="body-tiny hover:text-accent transition-colors duration-200 block"
                onClick={(e) => e.stopPropagation()}
              >
                {data.series.publisher.name}
              </a>
            )}
            {showSite && data.siteName && (
              <p className="body-tiny truncate mt-1" title={data.site2Name ? `${data.siteName}, ${data.site2Name}` : data.siteName}>
                {data.site2Name ? `${data.siteName}, ${data.site2Name}` : data.siteName}
              </p>
            )}
            {showDate && releaseDate && (
              <p className="body-tiny mt-1">
                {formatDate(releaseDate)}
              </p>
            )}
          </div>
        )}
      </Link>
    </div>
  )
}

