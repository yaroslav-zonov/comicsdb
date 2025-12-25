/**
 * Декодирует HTML-сущности в тексте
 * Например: &#39; -> ', &quot; -> ", &amp; -> &, &#58; -> :
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
    .replace(/&#58;/g, ':')
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

import { isOldComicVineFormat, isNewComicVineFormat, shouldCheckMetron } from './metron-api'

/**
 * Преобразует URL изображения, заменяя scale_avatar на scale_large для лучшего качества
 * 
 * Логика работы:
 * 1. Если URL в новом формате ComicVine (/a/uploads/) - используем как есть
 * 2. Если URL в старом формате (api/image) и есть comicvineId - проверяем Metron
 * 3. Если найдено в Metron - используем Metron URL
 * 4. Иначе - используем оригинальный URL
 * 
 * @param url - URL изображения
 * @param comicvineId - Опциональный ComicVine ID для проверки в Metron
 * @param size - Размер изображения (не используется, оставлен для совместимости)
 * @returns Преобразованный URL или null, если URL пустой
 */
export function getImageUrl(
  url: string | null | undefined,
  comicvineId?: number | string,
  size: 'thumb' | 'tiny' | 'small' | 'super' = 'thumb'
): string | null {
  if (!url || url === '') return null

  // Если новый формат ComicVine - используем как есть
  if (isNewComicVineFormat(url)) {
    return url.replace(/scale_avatar/g, 'scale_large')
  }

  // Если старый формат и есть comicvineId - нужно проверить Metron
  // Но это асинхронная операция, поэтому здесь только проверяем формат
  // Для асинхронной проверки используйте getImageUrlWithMetron из metron-api.ts
  if (shouldCheckMetron(url, comicvineId)) {
    // В синхронной версии возвращаем оригинальный URL
    // Асинхронная проверка Metron будет выполнена отдельно
    return url.replace(/scale_avatar/g, 'scale_large')
  }

  // Обычная обработка ComicVine URL
  return url.replace(/scale_avatar/g, 'scale_large')
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

/**
 * Правильно склоняет числительные по-русски
 * @param count - Число
 * @param forms - Массив форм: [1, 2-4, 5+] например: ['день', 'дня', 'дней']
 * @returns Строка с правильно склонённым числительным
 */
export function pluralize(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10
  const mod100 = count % 100
  
  if (mod10 === 1 && mod100 !== 11) {
    return forms[0] // 1 день, 21 день, 31 день
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return forms[1] // 2-4 дня, 22-24 дня
  } else {
    return forms[2] // 5-20 дней, 25-30 дней
  }
}
