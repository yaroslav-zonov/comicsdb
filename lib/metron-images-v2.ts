/**
 * Утилита для работы с кэшированными изображениями Metron (v2)
 * 
 * Вместо хранения URL, система использует локальные файлы
 * и легкий индекс для быстрой проверки наличия кэша
 */

import metronCacheIndex from '@/data/metron-cache-index.json'

type MetronCacheIndex = {
  version: string
  lastUpdated: string
  cachedIds: string[]
}

// Кэш для быстрого доступа (Set для O(1) поиска)
let cachedIdsSet: Set<string> | null = null

/**
 * Загружает индекс кэшированных изображений
 * Использует кэш для оптимизации повторных вызовов
 */
function loadCacheIndex(): Set<string> {
  if (cachedIdsSet) {
    return cachedIdsSet
  }

  // Проверяем структуру данных
  if (metronCacheIndex && typeof metronCacheIndex === 'object' && 'cachedIds' in metronCacheIndex) {
    const index = metronCacheIndex as MetronCacheIndex
    cachedIdsSet = new Set(index.cachedIds || [])
    return cachedIdsSet
  }

  // Fallback на пустой Set
  cachedIdsSet = new Set()
  return cachedIdsSet
}

/**
 * Проверяет, есть ли кэшированное изображение Metron для указанного ComicVine ID
 * @param comicvineId - ComicVine ID комикса
 * @returns true, если есть кэш
 */
export function hasMetronCache(comicvineId: number | string): boolean {
  const cachedIds = loadCacheIndex()
  const id = String(comicvineId)
  return cachedIds.has(id)
}

/**
 * Генерирует путь к кэшированному изображению Metron
 * @param comicvineId - ComicVine ID комикса
 * @param size - Размер изображения (thumb, tiny, small, super)
 * @returns Путь к изображению или null, если кэша нет
 */
export function getMetronCachePath(
  comicvineId: number | string,
  size: 'thumb' | 'tiny' | 'small' | 'super' = 'thumb'
): string | null {
  if (!hasMetronCache(comicvineId)) {
    return null
  }

  const id = String(comicvineId)
  // Предполагаем формат: /images/metron/{size}/{comicvineId}.jpg
  return `/images/metron/${size}/${id}.jpg`
}

/**
 * Подменяет URL изображения ComicVine на локальный кэш Metron, если есть
 * @param comicvineId - ComicVine ID комикса
 * @param comicvineUrl - Оригинальный URL изображения ComicVine
 * @param size - Размер изображения (thumb, tiny, small, super)
 * @returns Путь к кэшу Metron, если есть, иначе оригинальный URL ComicVine
 */
export function replaceImageUrlWithMetronCache(
  comicvineId: number | string,
  comicvineUrl: string | null | undefined,
  size: 'thumb' | 'tiny' | 'small' | 'super' = 'thumb'
): string | null {
  if (!comicvineUrl) {
    return null
  }

  // Пытаемся получить путь к кэшу
  const cachePath = getMetronCachePath(comicvineId, size)
  if (cachePath) {
    return cachePath
  }

  // Если кэша нет, возвращаем оригинальный ComicVine URL
  return comicvineUrl
}

/**
 * Получает статистику кэша
 */
export function getCacheStats() {
  const cachedIds = loadCacheIndex()
  return {
    totalCached: cachedIds.size,
    cachedIds: Array.from(cachedIds),
  }
}

