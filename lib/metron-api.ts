/**
 * Утилита для работы с Metron API
 * 
 * Логика работы:
 * 1. Если URL ComicVine в старом формате (api/image) - ищем в Metron
 * 2. Если URL в новом формате (a/uploads) - используем как есть
 * 3. Запрос к Metron API: GET /api/v1/issue?cv_id={comicvineId}
 * 4. Кэшируем результаты поиска
 * 5. Строго соблюдаем лимиты: 30 запросов/мин, 10000/день
 */

import metronCacheIndex from '@/data/metron-cache-index.json'

type MetronCacheIndex = {
  version: string
  lastUpdated: string
  // ID с найденными изображениями в Metron и их URL
  cachedImages: { [comicvineId: string]: string }
  // ID, которые уже проверяли (включая не найденные)
  checkedIds: string[]
}

type MetronIssueResponse = {
  id: number
  cv_id: number
  image: string | null
  thumb: string | null
  // Другие поля из API
}

// Кэш для быстрого доступа
let cachedImagesMap: Map<string, string> | null = null
let checkedIdsSet: Set<string> | null = null

// Очередь запросов для соблюдения лимитов
let requestQueue: Array<() => Promise<void>> = []
let isProcessingQueue = false
let lastRequestTime = 0
// Увеличена задержка для безопасности: 4 секунды = 15 запросов/мин (вместо 30)
const MIN_DELAY_BETWEEN_REQUESTS = 4000 // 4 секунды (безопасный запас)

/**
 * Загружает индекс кэша
 */
function loadCacheIndex(): { cached: Map<string, string>; checked: Set<string> } {
  if (cachedImagesMap && checkedIdsSet) {
    return { cached: cachedImagesMap, checked: checkedIdsSet }
  }

  if (metronCacheIndex && typeof metronCacheIndex === 'object') {
    const index = metronCacheIndex as MetronCacheIndex
    cachedImagesMap = new Map(Object.entries(index.cachedImages || {}))
    checkedIdsSet = new Set(index.checkedIds || [])
    return { cached: cachedImagesMap, checked: checkedIdsSet }
  }

  cachedImagesMap = new Map()
  checkedIdsSet = new Set()
  return { cached: cachedImagesMap, checked: checkedIdsSet }
}

/**
 * Сохраняет индекс кэша
 * Примечание: В production лучше использовать API route для записи
 * Работает только на сервере (Node.js окружение)
 */
async function saveCacheIndex(cachedImages: Map<string, string>, checkedIds: string[]) {
  // Проверяем, что мы на сервере
  if (typeof window !== 'undefined') {
    return // Не сохраняем на клиенте
  }

  // Проверяем наличие Node.js окружения
  if (typeof process === 'undefined' || !process.cwd) {
    return // Не сохраняем без Node.js
  }

  try {
    // Динамический импорт только на сервере
    // Используем строковый импорт для предотвращения включения в клиентский бандл
    const fsModule = 'fs'
    const pathModule = 'path'
    const fs = await import(fsModule)
    const path = await import(pathModule)
    const indexFile = path.join(process.cwd(), 'data', 'metron-cache-index.json')
    
    const index: MetronCacheIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      cachedImages: Object.fromEntries(cachedImages),
      checkedIds,
    }

    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf-8')
  } catch (error) {
    // В production (Vercel) файловая система может быть read-only
    // Это нормально, кэш будет работать в памяти
    // Не логируем ошибки, чтобы не засорять консоль
  }
}

/**
 * Определяет, является ли URL ComicVine старым форматом (api/image)
 */
export function isOldComicVineFormat(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('api/image/')
}

/**
 * Определяет, является ли URL ComicVine новым форматом (a/uploads)
 */
export function isNewComicVineFormat(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('/a/uploads/scale_large/')
}

/**
 * Запрашивает данные issue из Metron API
 */
async function fetchMetronIssue(cvId: number | string): Promise<MetronIssueResponse | null> {
  const url = `https://metron.cloud/api/v1/issue/?cv_id=${cvId}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // Issue не найден в Metron
      }
      throw new Error(`Metron API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Metron API возвращает массив результатов
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as MetronIssueResponse
    }

    return null
  } catch (error: any) {
    console.error(`Error fetching Metron issue for cv_id ${cvId}:`, error.message)
    return null
  }
}

/**
 * Обрабатывает очередь запросов с соблюдением лимитов
 */
async function processRequestQueue() {
  if (isProcessingQueue) return
  isProcessingQueue = true

  while (requestQueue.length > 0) {
    const request = requestQueue.shift()
    if (!request) break

    // Соблюдаем задержку между запросами
    const timeSinceLastRequest = Date.now() - lastRequestTime
    if (timeSinceLastRequest < MIN_DELAY_BETWEEN_REQUESTS) {
      await new Promise(resolve => 
        setTimeout(resolve, MIN_DELAY_BETWEEN_REQUESTS - timeSinceLastRequest)
      )
    }

    await request()
    lastRequestTime = Date.now()
  }

  isProcessingQueue = false
}

/**
 * Проверяет наличие issue в Metron и кэширует результат
 * @param comicvineId - ComicVine ID (cv_id)
 * @returns URL изображения из Metron или null, если не найдено
 */
export async function checkMetronForIssue(
  comicvineId: number | string
): Promise<string | null> {
  const { cached, checked } = loadCacheIndex()
  const id = String(comicvineId)

  // Если уже проверяли и нашли - возвращаем URL из кэша
  if (cached.has(id)) {
    return cached.get(id) || null
  }

  // Если уже проверяли и не нашли - возвращаем null
  if (checked.has(id)) {
    return null
  }

  // Добавляем запрос в очередь
  return new Promise((resolve) => {
    requestQueue.push(async () => {
      try {
        const issue = await fetchMetronIssue(comicvineId)
        
        if (issue && issue.image) {
          // Нашли в Metron - используем поле image напрямую
          // Пример: "image": "https://static.metron.cloud/media/issue/2020/08/04/thor-v2-32.jpg"
          const imageUrl = issue.image
          
          // Сохраняем в кэш
          cached.set(id, imageUrl)
          checked.add(id)
          await saveCacheIndex(cached, Array.from(checked))
          
          resolve(imageUrl)
        } else {
          // Не нашли в Metron - помечаем как проверенное
          checked.add(id)
          await saveCacheIndex(cached, Array.from(checked))
          resolve(null)
        }
      } catch (error: any) {
        // При ошибке помечаем как проверенное, чтобы не повторять запрос
        checked.add(id)
        await saveCacheIndex(cached, Array.from(checked))
        resolve(null)
      }
    })

    // Запускаем обработку очереди
    processRequestQueue()
  })
}

/**
 * Проверяет, нужно ли искать в Metron для данного URL
 */
export function shouldCheckMetron(
  url: string | null | undefined,
  comicvineId?: number | string
): boolean {
  // Если нет URL или comicvineId - не проверяем
  if (!url || comicvineId === undefined) return false

  // Если новый формат ComicVine - не проверяем
  if (isNewComicVineFormat(url)) return false

  // Если старый формат ComicVine - проверяем
  return isOldComicVineFormat(url)
}

/**
 * Получает URL изображения с учетом Metron
 * Асинхронная версия для использования в серверных компонентах
 */
export async function getImageUrlWithMetron(
  url: string | null | undefined,
  comicvineId?: number | string,
  size: 'thumb' | 'tiny' | 'small' | 'super' = 'thumb'
): Promise<string | null> {
  if (!url) return null

  // Если новый формат ComicVine - используем как есть
  if (isNewComicVineFormat(url)) {
    return url.replace(/scale_avatar/g, 'scale_large')
  }

  // Если старый формат и есть comicvineId - проверяем Metron
  if (shouldCheckMetron(url, comicvineId)) {
    const metronUrl = await checkMetronForIssue(comicvineId!)
    if (metronUrl) {
      return metronUrl
    }
  }

  // Fallback на оригинальный URL
  return url.replace(/scale_avatar/g, 'scale_large')
}

/**
 * Получает статистику кэша
 */
export function getCacheStats() {
  const { cached, checked } = loadCacheIndex()
  return {
    cachedCount: cached.size,
    checkedCount: checked.size,
    cachedImages: Object.fromEntries(cached),
    checkedIds: Array.from(checked),
  }
}

