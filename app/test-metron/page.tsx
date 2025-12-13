import { prisma } from '@/lib/prisma'
import { getMetronImageUrl } from '@/lib/metron'
import { getImageUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function TestMetronPage() {
  // Получаем несколько комиксов
  const comics = await prisma.comic.findMany({
    where: {
      dateDelete: null,
      comicvine: { gt: 0 },
    },
    take: 5,
    select: {
      id: true,
      comicvine: true,
      thumb: true,
      tiny: true,
    },
  })

  const results = await Promise.all(
    comics.map(async (comic) => {
      const metronUrl = await getMetronImageUrl(comic.comicvine)
      const comicvineUrl = getImageUrl(comic.thumb)
      const finalUrl = metronUrl ? metronUrl : comicvineUrl

      return {
        id: comic.id,
        comicvine: comic.comicvine,
        metronUrl,
        comicvineUrl,
        finalUrl,
        isMetron: finalUrl?.includes('metron'),
        isComicvine: finalUrl?.includes('comicvine'),
      }
    })
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тест Metron API</h1>
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.id} className="border p-4 rounded">
            <p><strong>Comic ID:</strong> {result.id}</p>
            <p><strong>Comicvine ID:</strong> {result.comicvine}</p>
            <p><strong>Metron URL:</strong> {result.metronUrl ? (
              <span className="text-green-600">{result.metronUrl.substring(0, 80)}...</span>
            ) : (
              <span className="text-red-600">null (не найден)</span>
            )}</p>
            <p><strong>Comicvine URL:</strong> {result.comicvineUrl?.substring(0, 80)}...</p>
            <p><strong>Final URL:</strong> {result.finalUrl?.substring(0, 80)}...</p>
            <p>
              <strong>Используется:</strong>{' '}
              {result.isMetron ? (
                <span className="text-green-600 font-bold">✅ METRON</span>
              ) : result.isComicvine ? (
                <span className="text-red-600 font-bold">❌ COMICVINE</span>
              ) : (
                <span className="text-gray-600">Нет URL</span>
              )}
            </p>
            {result.finalUrl && (
              <img 
                src={result.finalUrl} 
                alt={`Comic ${result.id}`}
                className="mt-2 max-w-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

