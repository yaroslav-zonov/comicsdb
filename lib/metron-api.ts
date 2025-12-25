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

import {
  loadCache,
  saveCache,
  getCachedImage,
  isChecked,
  saveCachedImage,
  saveChecked,
} from './metron-cache-kv'

type MetronIssueResponse = {
  id: number
  cv_id: number
  image: string | null
  thumb: string | null
  // Другие поля из API
}

// Очередь запросов для соблюдения лимитов
let requestQueue: Array<() => Promise<void>> = []
let isProcessingQueue = false
let lastRequestTime = 0
// Увеличена задержка для безопасности: 4 секунды = 15 запросов/мин (вместо 30)
const MIN_DELAY_BETWEEN_REQUESTS = 4000 // 4 секунды (безопасный запас)

// Кэш загружается асинхронно из KV или памяти

// Сохранение кэша теперь через KV или память (см. metron-cache-kv.ts)

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
  const id = String(comicvineId)

  // Проверяем кэш (из KV или памяти)
  const cachedUrl = await getCachedImage(id)
  if (cachedUrl) {
    return cachedUrl
  }

  // Проверяем, был ли уже проверен
  if (await isChecked(id)) {
    return null
  }

  // Добавляем запрос в очередь
  return new Promise((resolve) => {
    requestQueue.push(async () => {
      try {
        // Логируем начало запроса (только в development)
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 [Metron] Проверяю ComicVine ID: ${comicvineId}`)
        }
        
        const issue = await fetchMetronIssue(comicvineId)
        
        if (issue && issue.image) {
          // Нашли в Metron - используем поле image напрямую
          const imageUrl = issue.image
          
          // Сохраняем в кэш (KV или память)
          await saveCachedImage(id, imageUrl)
          
          // Логируем успешное нахождение (только в development)
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [Metron] Найдено изображение для ${id}: ${imageUrl.substring(0, 60)}...`)
          }
          
          resolve(imageUrl)
        } else {
          // Не нашли в Metron - помечаем как проверенное
          await saveChecked(id)
          
          // Логируем отсутствие (только в development)
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️  [Metron] Не найдено изображение для ${id}`)
          }
          
          resolve(null)
        }
      } catch (error: any) {
        // При ошибке помечаем как проверенное
        await saveChecked(id)
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
export async function getCacheStats() {
  const stats = await import('./metron-cache-kv').then(m => m.getCacheStats())
  return stats
}

