import { prisma } from './prisma'

/**
 * Получает URL изображения из Metron API по comicvine ID
 * Сначала проверяет кеш в БД, затем запрашивает API и сохраняет результат
 * @param comicvineId - Comicvine ID комикса (cv_id)
 * @param comicId - ID комикса в БД (опционально, для сохранения кеша)
 * @returns URL изображения из Metron (строка image) или null
 */
export async function getMetronImageUrl(
  comicvineId: number | null | undefined,
  comicId?: number
): Promise<string | null> {
  if (!comicvineId) return null

  // Сначала проверяем кеш в БД
  if (comicId) {
    const comic = await prisma.comic.findUnique({
      where: { id: comicId },
      select: { metronImageUrl: true },
    })
    
    if (comic?.metronImageUrl) {
      return comic.metronImageUrl
    }
  } else {
    // Если comicId не передан, ищем по comicvine ID
    const comic = await prisma.comic.findFirst({
      where: { 
        comicvine: comicvineId,
        dateDelete: null,
        metronImageUrl: { not: null },
      },
      select: { metronImageUrl: true },
      orderBy: { id: 'desc' }, // Берем последний (на случай дублей)
    })
    
    if (comic?.metronImageUrl) {
      return comic.metronImageUrl
    }
  }

  // Если в кеше нет, запрашиваем API
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
        const imageUrl = data.results[0].image || null
        
        // Сохраняем в кеш БД, если есть comicId
        if (imageUrl && comicId) {
          // Сохраняем асинхронно, не блокируя ответ
          prisma.comic.update({
            where: { id: comicId },
            data: { metronImageUrl: imageUrl },
          }).catch(() => {
            // Игнорируем ошибки сохранения
          })
        }
        
        return imageUrl
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

