/**
 * Получает URL изображения из Metron API по comicvine ID
 * @param comicvineId - Comicvine ID комикса (cv_id)
 * @returns URL изображения из Metron (строка image) или null
 */
export async function getMetronImageUrl(comicvineId: number | null | undefined): Promise<string | null> {
  if (!comicvineId) return null

  try {
    const url = `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`
    
    // Добавляем таймаут для избежания долгих ожиданий
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 секунд таймаут
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      // Без кеширования
      cache: 'no-store',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      // Если 404 - комикс не найден в Metron, это нормально
      return null
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].image || null
      // Возвращаем строку image из ответа Metron
      return imageUrl
    }

    return null
  } catch (error: any) {
    // Игнорируем ошибки сети/таймаута - просто возвращаем null
    if (error.name !== 'AbortError') {
      console.error(`[Metron] Error fetching image for cv_id ${comicvineId}:`, error.message)
    }
    return null
  }
}

