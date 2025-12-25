/**
 * Хранилище кэша Metron через Vercel KV (Redis)
 * 
 * Если Vercel KV не настроен, использует fallback на in-memory кэш
 */

type MetronCacheData = {
  cachedImages: { [comicvineId: string]: string }
  checkedIds: string[]
  lastUpdated: string
}

// Fallback: in-memory кэш если KV недоступен
let memoryCache: MetronCacheData = {
  cachedImages: {},
  checkedIds: [],
  lastUpdated: new Date().toISOString().split('T')[0],
}

/**
 * Получает клиент Vercel KV (если доступен)
 */
async function getKVClient() {
  try {
    // Пытаемся импортировать @vercel/kv
    const { kv } = await import('@vercel/kv')
    return kv
  } catch (error) {
    // KV не настроен - используем fallback
    return null
  }
}

const CACHE_KEY = 'metron:cache'

/**
 * Загружает кэш из KV или памяти
 */
export async function loadCache(): Promise<MetronCacheData> {
  const kv = await getKVClient()
  
  if (kv) {
    try {
      const data = await kv.get<MetronCacheData>(CACHE_KEY)
      if (data) {
        return data
      }
    } catch (error) {
      console.error('Ошибка загрузки из KV:', error)
    }
  }
  
  // Fallback на in-memory кэш
  return memoryCache
}

/**
 * Сохраняет кэш в KV или память
 */
export async function saveCache(data: MetronCacheData): Promise<void> {
  const kv = await getKVClient()
  
  if (kv) {
    try {
      await kv.set(CACHE_KEY, data)
      return
    } catch (error) {
      console.error('Ошибка сохранения в KV:', error)
    }
  }
  
  // Fallback на in-memory кэш
  memoryCache = data
}

/**
 * Получает URL изображения из кэша
 */
export async function getCachedImage(comicvineId: string): Promise<string | null> {
  const cache = await loadCache()
  return cache.cachedImages[comicvineId] || null
}

/**
 * Проверяет, был ли уже проверен этот ID
 */
export async function isChecked(comicvineId: string): Promise<boolean> {
  const cache = await loadCache()
  return cache.checkedIds.includes(comicvineId)
}

/**
 * Сохраняет найденное изображение
 */
export async function saveCachedImage(comicvineId: string, imageUrl: string): Promise<void> {
  const cache = await loadCache()
  cache.cachedImages[comicvineId] = imageUrl
  if (!cache.checkedIds.includes(comicvineId)) {
    cache.checkedIds.push(comicvineId)
  }
  cache.lastUpdated = new Date().toISOString().split('T')[0]
  await saveCache(cache)
}

/**
 * Сохраняет информацию о том, что ID проверен (но не найден)
 */
export async function saveChecked(comicvineId: string): Promise<void> {
  const cache = await loadCache()
  if (!cache.checkedIds.includes(comicvineId)) {
    cache.checkedIds.push(comicvineId)
  }
  cache.lastUpdated = new Date().toISOString().split('T')[0]
  await saveCache(cache)
}

/**
 * Получает статистику кэша
 */
export async function getCacheStats() {
  const cache = await loadCache()
  return {
    cachedCount: Object.keys(cache.cachedImages).length,
    checkedCount: cache.checkedIds.length,
    lastUpdated: cache.lastUpdated,
    cachedImages: cache.cachedImages,
    checkedIds: cache.checkedIds,
  }
}

