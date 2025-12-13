/**
 * Получает URL изображения из Metron API по comicvine ID
 * @param comicvineId - Comicvine ID комикса (cv_id)
 * @returns URL изображения из Metron (строка image) или null
 */
export async function getMetronImageUrl(comicvineId: number | null | undefined): Promise<string | null> {
  if (!comicvineId) return null

  try {
    const response = await fetch(
      `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`,
      {
        headers: { 'Accept': 'application/json' },
        // Без кеширования
        cache: 'no-store',
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      // Возвращаем строку image из ответа Metron
      return data.results[0].image || null
    }

    return null
  } catch (error) {
    console.error('Error fetching Metron image:', error)
    return null
  }
}

