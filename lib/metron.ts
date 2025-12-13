/**
 * Получает URL изображения из Metron API по comicvine ID
 * @param comicvineId - Comicvine ID комикса (cv_id)
 * @returns URL изображения из Metron (строка image) или null
 */
export async function getMetronImageUrl(comicvineId: number | null | undefined): Promise<string | null> {
  if (!comicvineId) return null

  try {
    const url = `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`
    
    // Создаём AbortController для таймаута (совместимо с Node.js)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    try {
      const response = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'ComicsDB/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        return data.results[0].image || null
      }

      return null
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error: any) {
    // Игнорируем ошибки сети/таймаута - просто возвращаем null
    // Fallback на Comicvine будет использован автоматически
    return null
  }
}

