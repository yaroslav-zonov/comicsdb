/**
 * Получает URL изображения из Metron API по comicvine ID
 * @param comicvineId - Comicvine ID комикса (cv_id)
 * @returns URL изображения из Metron (строка image) или null
 */
export async function getMetronImageUrl(comicvineId: number | null | undefined): Promise<string | null> {
  if (!comicvineId) return null

  try {
    const url = `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      return data.results[0].image || null
    }

    return null
  } catch (error) {
    // Игнорируем все ошибки - просто возвращаем null
    return null
  }
}

