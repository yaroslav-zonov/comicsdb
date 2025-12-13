/**
 * Получает URL изображения из Metron API по comicvine ID
 * Используется на сервере для получения изображений
 */
export async function getMetronImageUrl(comicvineId: number | null | undefined): Promise<string | null> {
  if (!comicvineId) return null

  try {
    // Запрашиваем issue из Metron API по cv_id
    const response = await fetch(
      `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Кешируем на стороне сервера на 7 дней
        next: { revalidate: 604800 },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    // Metron возвращает массив результатов, берем первый
    if (data.results && data.results.length > 0) {
      const issue = data.results[0]
      return issue.image || null
    }

    return null
  } catch (error) {
    console.error('Error fetching Metron image:', error)
    return null
  }
}

/**
 * Получает URL изображения с приоритетом Metron, fallback на Comicvine
 * @param comicvineId - Comicvine ID комикса
 * @param comicvineUrl - URL изображения из Comicvine (fallback)
 * @returns URL изображения из Metron или Comicvine
 */
export async function getImageUrlWithMetron(
  comicvineId: number | null | undefined,
  comicvineUrl: string | null | undefined
): Promise<string | null> {
  // Сначала пытаемся получить из Metron
  const metronUrl = await getMetronImageUrl(comicvineId)
  if (metronUrl) {
    return metronUrl
  }
  
  // Если Metron не вернул, используем Comicvine
  if (!comicvineUrl || comicvineUrl === '') return null
  return comicvineUrl.replace(/scale_avatar/g, 'scale_large')
}

