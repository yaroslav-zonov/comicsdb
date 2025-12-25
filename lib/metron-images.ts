/**
 * Утилита для работы с соответствиями изображений Metron
 * Хранит соответствие ComicVine ID -> Metron URL для подмены изображений
 */

import metronImages from '@/data/metron-images.json'

type MetronImageSizes = {
  thumb?: string
  tiny?: string
  small?: string
  super?: string
}

type MetronMappings = {
  [comicvineId: string]: MetronImageSizes
}

// Кэш для быстрого доступа
let mappingsCache: MetronMappings | null = null

/**
 * Загружает соответствия из JSON файла
 * Использует кэш для оптимизации повторных вызовов
 */
function loadMappings(): MetronMappings {
  if (mappingsCache) {
    return mappingsCache
  }

  // Проверяем структуру данных
  if (metronImages && typeof metronImages === 'object' && 'mappings' in metronImages) {
    mappingsCache = (metronImages as { mappings: MetronMappings }).mappings
    return mappingsCache
  }

  // Fallback на пустой объект
  mappingsCache = {}
  return mappingsCache
}

/**
 * Получает URL изображения Metron для указанного ComicVine ID и размера
 * @param comicvineId - ComicVine ID комикса
 * @param size - Размер изображения (thumb, tiny, small, super)
 * @returns URL изображения Metron или null, если соответствие не найдено
 */
export function getMetronImageUrl(
  comicvineId: number | string,
  size: 'thumb' | 'tiny' | 'small' | 'super' = 'thumb'
): string | null {
  const mappings = loadMappings()
  const id = String(comicvineId)
  
  const mapping = mappings[id]
  if (!mapping) {
    return null
  }

  return mapping[size] || null
}

/**
 * Проверяет, есть ли соответствие Metron для указанного ComicVine ID
 * @param comicvineId - ComicVine ID комикса
 * @returns true, если есть соответствие Metron
 */
export function hasMetronImage(comicvineId: number | string): boolean {
  const mappings = loadMappings()
  const id = String(comicvineId)
  return id in mappings && mappings[id] !== undefined
}

/**
 * Получает все доступные размеры изображений Metron для указанного ComicVine ID
 * @param comicvineId - ComicVine ID комикса
 * @returns Объект с размерами изображений или null, если соответствие не найдено
 */
export function getMetronImageSizes(
  comicvineId: number | string
): MetronImageSizes | null {
  const mappings = loadMappings()
  const id = String(comicvineId)
  
  return mappings[id] || null
}

/**
 * Подменяет URL изображения ComicVine на Metron, если есть соответствие
 * @param comicvineId - ComicVine ID комикса
 * @param comicvineUrl - Оригинальный URL изображения ComicVine
 * @param size - Размер изображения (thumb, tiny, small, super)
 * @returns URL Metron, если есть соответствие, иначе оригинальный URL ComicVine
 */
export function replaceImageUrlWithMetron(
  comicvineId: number | string,
  comicvineUrl: string | null | undefined,
  size: 'thumb' | 'tiny' | 'small' | 'super' = 'thumb'
): string | null {
  if (!comicvineUrl) {
    return null
  }

  // Пытаемся получить Metron URL
  const metronUrl = getMetronImageUrl(comicvineId, size)
  if (metronUrl) {
    return metronUrl
  }

  // Если Metron URL нет, возвращаем оригинальный ComicVine URL
  return comicvineUrl
}

