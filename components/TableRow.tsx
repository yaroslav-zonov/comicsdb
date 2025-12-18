import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { getComicUrl, getSeriesUrl, getImageUrl, formatDate } from '@/lib/utils'

type ComicRowData = {
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
  siteId?: string | null
  site2Name?: string | null
  site2Id?: string | null
  translate?: string | null
  edit?: string | null
  date?: Date | null
  pdate?: Date | null
  adddate?: Date | null
  link?: string | null
  hasGlobalEvent?: boolean
  isJoint?: boolean
}

type SeriesRowData = {
  id: number
  name: string
  publisher: {
    id: number
    name: string
  }
  thumb?: string | null
  status?: string
  comicsCount: number
  total?: number
}

type TableRowProps = 
  | {
      type: 'comic'
      variant: 'main' | 'comic-page' | 'character-creator-team' | 'scanlator' | 'series'
      data: ComicRowData
      scanlatorQuery?: string // Для фильтрации ролей искомого сканлейтера
    }
  | {
      type: 'series'
      variant: 'search'
      data: SeriesRowData
    }

export default function TableRow(props: TableRowProps) {
  if (props.type === 'series') {
    const { data } = props
    const imageUrl = getImageUrl(data.thumb)
    
    // Вычисляем статус перевода на основе количества переведённых и общего количества
    // Если переведено столько же, сколько всего - завершён, иначе - продолжается
    // (упрощённая логика, так как нет доступа к дате последнего перевода)
    const totalIssues = (data as any).comicvine || data.total || 0
    const translationStatus = totalIssues > 0 && data.comicsCount >= totalIssues
      ? 'Завершён'
      : 'Продолжается'

    return (
      <tr className="border-t border-border-primary first:border-t-0">
        <td className="py-3 whitespace-nowrap">
          <Link href={getSeriesUrl(data.publisher.id, data.id)}>
            <div className="relative w-12 aspect-[2/3] bg-bg-tertiary">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={data.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-text-tertiary text-xs">Нет</span>
                </div>
              )}
            </div>
          </Link>
        </td>
        <td className="py-3">
          <div>
            <Link
              href={getSeriesUrl(data.publisher.id, data.id)}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors block"
            >
              {data.name}
              {(data as any).volume && (data as any).volume !== '0' && (
                <span className="text-text-secondary ml-1">({(data as any).volume})</span>
              )}
            </Link>
            <Link
              href={`/publishers/${data.publisher.id}`}
              className="text-xs text-text-secondary hover:text-accent transition-colors"
            >
              {data.publisher.name}
            </Link>
          </div>
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {translationStatus}
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.comicsCount}
          {totalIssues > 0 && ` / ${totalIssues}`}
        </td>
      </tr>
    )
  }

  // Comic row
  const { data, variant } = props
  // Используем большой размер везде: thumb (приоритет) > tiny (fallback)
  const comicvineUrl = data.thumb || data.tiny
  const releaseDate = data.date || data.pdate

  if (variant === 'comic-page') {
    // На странице выпуска: сайт-переводчик / переводчик / оформитель / дата публикации / кнопка скачать
    const comicData = data as ComicRowData & { isJoint?: boolean; site2Name?: string | null; site2Id?: string | null }

    return (
      <tr className="border-t border-border-primary first:border-t-0">
        <td className="py-3 whitespace-nowrap">
          {comicData.siteName && comicData.siteId ? (
            <div className="flex flex-wrap gap-1">
              <Link
                href={`/sites/${comicData.siteId}`}
                className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
              >
                {comicData.siteName}
              </Link>
              {comicData.site2Name && comicData.site2Id && (
                <>
                  <span className="text-text-tertiary">,</span>
                  <Link
                    href={`/sites/${comicData.site2Id}`}
                    className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
                  >
                    {comicData.site2Name}
                  </Link>
                </>
              )}
            </div>
          ) : comicData.siteName ? (
            <Link
              href={`/search?q=${encodeURIComponent(comicData.siteName)}&type=scanlator&tab=scanlators`}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
            >
              {comicData.siteName}
            </Link>
          ) : (
            <span className="text-sm text-text-secondary">-</span>
          )}
        </td>
        <td className="py-3 hidden lg:table-cell">
          {data.translate ? (
            <div className="flex flex-wrap gap-1">
              {data.translate.split(',').map((name, idx) => {
                const trimmed = name.trim()
                if (!trimmed) return null
                return (
                  <Link
                    key={idx}
                    href={`/search?q=${encodeURIComponent(trimmed)}&type=scanlator&tab=scanlators`}
                    className="text-sm text-text-primary hover:text-accent hover:underline whitespace-nowrap"
                  >
                    {trimmed}
                  </Link>
                )
              })}
            </div>
          ) : (
            <span className="text-sm text-text-secondary">-</span>
          )}
        </td>
        <td className="py-3 hidden lg:table-cell">
          {data.edit ? (
            <div className="flex flex-wrap gap-1">
              {data.edit.split(',').map((name, idx) => {
                const trimmed = name.trim()
                if (!trimmed) return null
                return (
                  <Link
                    key={idx}
                    href={`/search?q=${encodeURIComponent(trimmed)}&type=scanlator&tab=scanlators`}
                    className="text-sm text-text-primary hover:text-accent hover:underline whitespace-nowrap"
                  >
                    {trimmed}
                  </Link>
                )
              })}
            </div>
          ) : (
            <span className="text-sm text-text-secondary">-</span>
          )}
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.date ? formatDate(data.date) : '-'}
        </td>
        <td className="py-3 whitespace-nowrap text-right pr-0">
          <div className="flex items-center justify-end gap-3">
            {data.link ? (
              <a
                href={data.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary hover:text-accent transition-colors"
                title="Скачать"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </a>
            ) : (
              <span className="text-text-muted" title="Ссылка недоступна">
                <XMarkIcon className="w-5 h-5" />
              </span>
            )}
          </div>
        </td>
      </tr>
    )
  }

  if (variant === 'main') {
    // На главной: обложка / название + издательство / сайт-переводчик / дата публикации перевода / кнопка скачать
    const comicData = data as ComicRowData & { isJoint?: boolean; site2Name?: string | null; site2Id?: string | null }
    
    return (
      <>
        {/* Десктопная версия */}
        <tr className="border-t border-border-primary dark:border-border-primary first:border-t-0 hidden md:table-row">
          <td className="py-3 whitespace-nowrap">
            <Link href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}>
              <div className="relative w-12 aspect-[2/3]">
                {comicvineUrl ? (
                  <Image
                    src={comicvineUrl}
                    alt={`${data.series.name} #${data.number}`}
                    fill
                    className="object-cover"
                    sizes="48px"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                    <span className="text-text-tertiary text-xs">Нет</span>
                  </div>
                )}
              </div>
            </Link>
          </td>
          <td className="py-3">
            <div>
              <Link
                href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}
                className="text-sm font-medium text-text-primary hover:text-accent transition-colors block"
              >
                {data.series.name} #{data.number}
              </Link>
              <Link
                href={`/publishers/${data.series.publisher.id}`}
                className="text-xs text-text-secondary hover:text-accent transition-colors"
              >
                {data.series.publisher.name}
              </Link>
            </div>
          </td>
          <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
            {data.siteName && data.siteId ? (
              <div className="flex flex-wrap gap-1">
                <Link
                  href={`/sites/${data.siteId}`}
                  className="text-text-primary hover:text-accent hover:underline transition-colors"
                >
                  {data.siteName}
                </Link>
                {data.site2Name && data.site2Id && (
                  <>
                    <span className="text-text-tertiary">,</span>
                    <Link
                      href={`/sites/${data.site2Id}`}
                      className="text-text-primary hover:text-accent hover:underline transition-colors"
                    >
                      {data.site2Name}
                    </Link>
                  </>
                )}
              </div>
            ) : data.siteName || '-'}
          </td>
          <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
            {data.date
              ? formatDate(data.date)
              : '-'}
          </td>
          <td className="py-3 whitespace-nowrap text-right pr-0">
            {data.link ? (
              <a
                href={data.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary hover:text-accent transition-colors"
                title="Скачать"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </a>
            ) : (
              <span className="text-text-muted" title="Ссылка недоступна">
                <XMarkIcon className="w-5 h-5" />
              </span>
            )}
          </td>
        </tr>
        {/* Мобильная компактная версия */}
        <tr className="border-t border-border-primary dark:border-border-primary first:border-t-0 md:hidden">
          <td className="py-2 px-2" colSpan={5}>
            <div className="flex items-start gap-3">
              <Link href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)} className="flex-shrink-0">
                <div className="relative w-10 aspect-[2/3]">
                  {comicvineUrl ? (
                    <Image
                      src={comicvineUrl}
                      alt={`${data.series.name} #${data.number}`}
                      fill
                      className="object-cover"
                      sizes="40px"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                      <span className="text-text-tertiary text-xs">Нет</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}
                  className="text-sm font-medium text-text-primary hover:text-accent transition-colors block truncate"
                >
                  {data.series.name} #{data.number}
                </Link>
                <div className="text-xs text-text-secondary truncate mt-0.5">
                  {data.siteName || '-'}
                  {data.date && ` • ${formatDate(data.date)}`}
                </div>
              </div>
              {data.link && (
                <a
                  href={data.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-text-tertiary hover:text-accent transition-colors"
                  title="Скачать"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </a>
              )}
            </div>
          </td>
        </tr>
      </>
    )
  }

  if (variant === 'character-creator-team') {
    // Поиск по персонажу/автору/команде: обложка, название выпуска, издательство, дата перевода, дата публикации, сайт, скачать
    return (
      <tr className="border-t border-border-primary first:border-t-0">
        <td className="py-3 whitespace-nowrap">
          <Link href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}>
            <div className="relative w-12 aspect-[2/3]">
              {comicvineUrl ? (
                <Image
                  src={comicvineUrl}
                  alt={`${data.series.name} #${data.number}`}
                  fill
                  className="object-cover"
                  sizes="48px"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                  <span className="text-text-tertiary text-xs">Нет</span>
                </div>
              )}
            </div>
          </Link>
        </td>
        <td className="py-3">
          <div>
            <Link
              href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors block"
            >
              {data.series.name} #{data.number}
              {data.hasGlobalEvent && (
                <span className="ml-2 text-xs text-accent" title="Глобальное событие">★</span>
              )}
            </Link>
            <Link
              href={`/publishers/${data.series.publisher.id}`}
              className="text-xs text-text-secondary hover:text-accent transition-colors"
            >
              {data.series.publisher.name}
            </Link>
          </div>
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.siteName && data.siteId ? (
            <div className="flex flex-wrap gap-1">
              <Link
                href={`/sites/${data.siteId}`}
                className="text-text-primary hover:text-accent hover:underline transition-colors"
              >
                {data.siteName}
              </Link>
              {data.site2Name && data.site2Id && (
                <>
                  <span className="text-text-tertiary">,</span>
                  <Link
                    href={`/sites/${data.site2Id}`}
                    className="text-text-primary hover:text-accent hover:underline transition-colors"
                  >
                    {data.site2Name}
                  </Link>
                </>
              )}
            </div>
          ) : data.siteName || '-'}
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.date
            ? formatDate(data.date)
            : '-'}
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.pdate
            ? formatDate(data.pdate)
            : '-'}
        </td>
        <td className="py-3 whitespace-nowrap text-right pr-0">
          {data.link ? (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-accent transition-colors"
              title="Скачать"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </a>
          ) : (
            <span className="text-text-muted" title="Ссылка недоступна">
              <XMarkIcon className="w-5 h-5" />
            </span>
          )}
        </td>
      </tr>
    )
  }

  if (variant === 'series') {
    // На странице серии: обложка / сайт-переводчик / переводчик / оформитель / дата публикации / кнопка скачать
    return (
      <tr className="border-t border-border-primary first:border-t-0">
        <td className="py-3 whitespace-nowrap">
          <Link href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}>
            <div className="relative w-12 aspect-[2/3]">
              {comicvineUrl ? (
                <Image
                  src={comicvineUrl}
                  alt={`${data.series.name} #${data.number}`}
                  fill
                  className="object-cover"
                  sizes="48px"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                  <span className="text-text-tertiary text-xs">Нет</span>
                </div>
              )}
            </div>
          </Link>
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.siteName && data.siteId ? (
            <div className="flex flex-wrap gap-1">
              <Link
                href={`/sites/${data.siteId}`}
                className="text-text-primary hover:text-accent hover:underline transition-colors"
              >
                {data.siteName}
              </Link>
              {data.site2Name && data.site2Id && (
                <>
                  <span className="text-text-tertiary">,</span>
                  <Link
                    href={`/sites/${data.site2Id}`}
                    className="text-text-primary hover:text-accent hover:underline transition-colors"
                  >
                    {data.site2Name}
                  </Link>
                </>
              )}
            </div>
          ) : data.siteName || '-'}
        </td>
        <td className="py-3 whitespace-nowrap">
          {data.translate ? (
            <div className="flex flex-wrap gap-1">
              {data.translate.split(',').map((name, idx) => {
                const trimmed = name.trim()
                if (!trimmed) return null
                return (
                  <Link
                    key={idx}
                    href={`/search?q=${encodeURIComponent(trimmed)}&type=scanlator&tab=scanlators`}
                    className="text-sm text-text-primary hover:text-accent hover:underline"
                  >
                    {trimmed}
                  </Link>
                )
              })}
            </div>
          ) : (
            <span className="text-sm text-text-secondary">-</span>
          )}
        </td>
        <td className="py-3 whitespace-nowrap">
          {data.edit ? (
            <div className="flex flex-wrap gap-1">
              {data.edit.split(',').map((name, idx) => {
                const trimmed = name.trim()
                if (!trimmed) return null
                return (
                  <Link
                    key={idx}
                    href={`/search?q=${encodeURIComponent(trimmed)}&type=scanlator&tab=scanlators`}
                    className="text-sm text-text-primary hover:text-accent hover:underline"
                  >
                    {trimmed}
                  </Link>
                )
              })}
            </div>
          ) : (
            <span className="text-sm text-text-secondary">-</span>
          )}
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.date
            ? formatDate(data.date)
            : '-'}
        </td>
        <td className="py-3 whitespace-nowrap text-right pr-0">
          {data.link ? (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-accent transition-colors"
              title="Скачать"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </a>
          ) : (
            <span className="text-text-muted" title="Ссылка недоступна">
              <XMarkIcon className="w-5 h-5" />
            </span>
          )}
        </td>
      </tr>
    )
  }

  if (variant === 'scanlator') {
    // Поиск по сканлейтеру: обложка, название выпуска, сайт + роли искомого сканлейтера, дата перевода, дата публикации, скачать
    const scanlatorQuery = props.scanlatorQuery?.toLowerCase().trim()
    
    // Определяем роли на основе наличия translate и edit, фильтруем только искомого сканлейтера
    const translateNames = data.translate ? data.translate.split(',').map(s => s.trim()).filter(Boolean) : []
    const editNames = data.edit ? data.edit.split(',').map(s => s.trim()).filter(Boolean) : []
    
    // Формируем список ролей только для искомого сканлейтера
    const roles: string[] = []
    if (scanlatorQuery) {
      const foundInTranslate = translateNames.find(name => name.toLowerCase().trim() === scanlatorQuery)
      const foundInEdit = editNames.find(name => name.toLowerCase().trim() === scanlatorQuery)
      
      if (foundInTranslate && foundInEdit) {
        roles.push('Переводчик, Оформитель')
      } else if (foundInTranslate) {
        roles.push('Переводчик')
      } else if (foundInEdit) {
        roles.push('Оформитель')
      }
    }

    return (
      <tr className="border-t border-border-primary first:border-t-0">
        <td className="py-3 whitespace-nowrap">
          <Link href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}>
            <div className="relative w-12 aspect-[2/3]">
              {comicvineUrl ? (
                <Image
                  src={comicvineUrl}
                  alt={`${data.series.name} #${data.number}`}
                  fill
                  className="object-cover"
                  sizes="48px"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                  <span className="text-text-tertiary text-xs">Нет</span>
                </div>
              )}
            </div>
          </Link>
        </td>
        <td className="py-3">
          <div>
            <Link
              href={getComicUrl(data.series.publisher.id, data.series.id, data.comicvine)}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors block"
            >
              {data.series.name} #{data.number}
              {data.hasGlobalEvent && (
                <span className="ml-2 text-xs text-accent" title="Глобальное событие">★</span>
              )}
            </Link>
            <Link
              href={`/publishers/${data.series.publisher.id}`}
              className="text-xs text-text-secondary hover:text-accent transition-colors"
            >
              {data.series.publisher.name}
            </Link>
          </div>
        </td>
        <td className="py-3 text-sm text-text-secondary">
          <div>
            {data.siteName && data.siteId ? (
              <div className="flex flex-wrap gap-1">
                <Link
                  href={`/sites/${data.siteId}`}
                  className="text-text-primary hover:text-accent hover:underline transition-colors"
                >
                  {data.siteName}
                </Link>
                {data.site2Name && data.site2Id && (
                  <>
                    <span className="text-text-tertiary">,</span>
                    <Link
                      href={`/sites/${data.site2Id}`}
                      className="text-text-primary hover:text-accent hover:underline transition-colors"
                    >
                      {data.site2Name}
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <span>{data.siteName || '-'}</span>
            )}
            {roles.length > 0 && (
              <div className="text-xs text-text-secondarymt-1">
                {roles.join(', ')}
              </div>
            )}
          </div>
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.date
            ? formatDate(data.date)
            : '-'}
        </td>
        <td className="py-3 whitespace-nowrap text-sm text-text-secondary">
          {data.pdate
            ? formatDate(data.pdate)
            : '-'}
        </td>
        <td className="py-3 whitespace-nowrap text-right pr-0">
          {data.link ? (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-accent transition-colors"
              title="Скачать"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </a>
          ) : (
            <span className="text-text-muted" title="Ссылка недоступна">
              <XMarkIcon className="w-5 h-5" />
            </span>
          )}
        </td>
      </tr>
    )
  }

  return null
}

