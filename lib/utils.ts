/**
 * Декодирует HTML-сущности в тексте
 * Например: &#39; -> ', &quot; -> ", &amp; -> &
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return ''
  
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

/**
 * Генерирует URL для комикса в формате /publishers/[publisherId]/[seriesId]/[comicId]
 * @param publisherId - ID издательства
 * @param seriesId - ID серии
 * @param comicvineId - comicvine ID комикса (постоянный идентификатор)
 */
export function getComicUrl(publisherId: number, seriesId: number, comicvineId: number): string {
  return `/publishers/${publisherId}/${seriesId}/${comicvineId}`
}

/**
 * Генерирует URL для серии в формате /publishers/[publisherId]/[seriesId]
 * @param publisherId - ID издательства
 * @param seriesId - ID серии
 */
export function getSeriesUrl(publisherId: number, seriesId: number): string {
  return `/publishers/${publisherId}/${seriesId}`
}

/**
 * Вычисляет статус перевода серии на основе количества переведённых выпусков,
 * общего количества выпусков, даты последнего перевода и статуса серии
 * @param translatedCount - Количество переведённых выпусков
 * @param totalIssues - Общее количество выпусков в серии
 * @param lastTranslationDate - Дата последнего перевода
 * @param seriesStatus - Статус серии из БД
 * @returns Статус перевода: "Завершён", "Заморожен" или "Продолжается"
 */
export function getTranslationStatus(
  translatedCount: number,
  totalIssues: number,
  lastTranslationDate: Date | null,
  seriesStatus: string
): string {
  // Если переведено столько же или больше, сколько всего выпусков - перевод завершён
  if (totalIssues > 0 && translatedCount >= totalIssues) {
    return 'Завершён'
  }
  
  // Если в течение полугода переводов не было - заморожен
  if (lastTranslationDate) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    if (lastTranslationDate < sixMonthsAgo) {
      return 'Заморожен'
    }
  }
  
  // Иначе - продолжается
  return 'Продолжается'
}

/**
 * Преобразует URL изображения, заменяя scale_avatar на scale_large для лучшего качества
 * @param url - URL изображения
 * @returns Преобразованный URL или null, если URL пустой
 */
export function getImageUrl(url: string | null | undefined): string | null {
  if (!url || url === '') return null
  return url.replace(/scale_avatar/g, 'scale_large')
}

/**
 * Получает URL изображения из Metron API по comicvine ID
 * Используется как приоритетный источник вместо Comicvine
 * @param comicvineId - Comicvine ID комикса
 * @returns URL изображения из Metron или null
 */
export async function getMetronImageUrl(comicvineId: number | null | undefined): Promise<string | null> {
  if (!comicvineId) return null
  
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/metron-image/${comicvineId}`,
      {
        // Кешируем на клиенте на 7 дней
        next: { revalidate: 604800 },
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.image || null
  } catch (error) {
    console.error('Error fetching Metron image:', error)
    return null
  }
}

/**
 * Получает URL изображения с приоритетом Metron, fallback на Comicvine
 * @param comicvineId - Comicvine ID комикса
 * @param comicvineUrl - URL изображения из Comicvine (fallback)
 * @returns URL изображения из Metron или Comicvine
 */
export async function getImageUrlWithMetron(
  comicvineId: number | null | undefined,
  comicvineUrl: string | null | undefined
): Promise<string | null> {
  // Сначала пытаемся получить из Metron
  const metronUrl = await getMetronImageUrl(comicvineId)
  if (metronUrl) {
    return metronUrl
  }
  
  // Если Metron не вернул, используем Comicvine
  return getImageUrl(comicvineUrl)
}

/**
 * Кодирует специальные символы в HTML-сущности для поиска в базе данных
 * Используется для поиска по полям, которые могут содержать HTML-сущности
 * @param query - Поисковый запрос
 * @returns Закодированный запрос
 */
export function encodeHtmlEntities(query: string): string {
  return query.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/&/g, '&amp;')
}

/**
 * Форматирует дату, убирая точку после сокращения месяца и "г." после года
 * @param date - Дата для форматирования
 * @param options - Опции форматирования (по умолчанию: day, month: 'short', year)
 * @returns Отформатированная дата без точки после месяца и "г." после года
 */
export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  
  const formatted = dateObj.toLocaleDateString('ru-RU', options || defaultOptions)
  // Убираем точку после месяца и "г." после года
  return formatted.replace(/\./g, '').replace(/\sг\.?\s?$/, '')
}
