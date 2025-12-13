/**
 * Получает URL изображения из Metron API по comicvine ID
 * @param comicvineId - Comicvine ID комикса
 * @returns URL изображения из Metron или null
 */
async function getMetronImageUrl(comicvineId: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 604800 }, // Кеш 7 дней
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      return data.results[0].image || null
    }

    return null
  } catch (error) {
    console.error('Error fetching Metron image:', error)
    return null
  }
}

/**
 * Подменяет Comicvine URL на Metron URL, если доступен comicvine ID
 * @param comicvineId - Comicvine ID комикса (из базы)
 * @param comicvineUrl - URL изображения из Comicvine
 * @returns URL из Metron (если найден) или обработанный Comicvine URL
 */
export async function getImageUrlWithMetron(
  comicvineId: number | null | undefined,
  comicvineUrl: string | null | undefined
): Promise<string | null> {
  // Если нет URL - возвращаем null
  if (!comicvineUrl || comicvineUrl === '') return null

  // Если есть comicvine ID - пытаемся получить из Metron
  if (comicvineId) {
    const metronUrl = await getMetronImageUrl(comicvineId)
    if (metronUrl) {
      return metronUrl
    }
  }

  // Если Metron не вернул или нет comicvine ID - используем Comicvine
  return comicvineUrl.replace(/scale_avatar/g, 'scale_large')
}

