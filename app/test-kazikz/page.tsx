import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

async function getScanlatorStats(name: string) {
  try {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return null
    }

    console.log('[getScanlatorStats] Searching for:', trimmedName)

    const lowerQuery = trimmedName.toLowerCase()
    console.log('[getScanlatorStats] Lower query:', lowerQuery, 'Length:', lowerQuery.length)

    // Используем упрощённую логику без CONCAT для избежания ошибок парсинга
    const startPattern = `${lowerQuery},%`
    const middlePattern = `%,${lowerQuery},%`
    const endPattern = `%,${lowerQuery}`

    const comics = await prisma.$queryRaw<Array<{
      id: number
      adddate: Date
      date: Date | null
      translate: string
      edit: string
    }>>(Prisma.sql`
      SELECT DISTINCT c.id, c.adddate, c.date, c.translate, c.edit
      FROM cdb_comics c
      WHERE c.date_delete IS NULL
        AND (
          LOWER(REPLACE(c.translate, ', ', ',')) LIKE ${middlePattern}
          OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE ${startPattern}
          OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE ${endPattern}
          OR LOWER(REPLACE(c.translate, ', ', ',')) = ${lowerQuery}
          OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE ${middlePattern}
          OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE ${startPattern}
          OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE ${endPattern}
          OR LOWER(REPLACE(c.edit, ', ', ',')) = ${lowerQuery}
        )
      ORDER BY c.adddate ASC
      LIMIT 10000
    `)

    console.log('[getScanlatorStats] Found comics:', comics.length)

    if (comics.length === 0) {
      console.log('[getScanlatorStats] No comics found for:', trimmedName)
      return null
    }

    // Находим реальное имя сканлейтера
    let realName = trimmedName
    for (const comic of comics) {
      if (comic.translate) {
        const translateList = comic.translate.split(',').map(s => s.trim())
        const found = translateList.find(s => s.toLowerCase() === lowerQuery)
        if (found) {
          realName = found
          break
        }
      }
      if (comic.edit) {
        const editList = comic.edit.split(',').map(s => s.trim())
        const found = editList.find(s => s.toLowerCase() === lowerQuery)
        if (found) {
          realName = found
          break
        }
      }
    }

    // Подсчет
    const normalizeForMatch = (name: string, query: string): boolean => {
      return name.toLowerCase().trim() === query.toLowerCase().trim()
    }

    const translatedCount = comics.filter(c => {
      if (!c.translate) return false
      const translateList = c.translate.split(',').map(s => s.trim())
      return translateList.some(s => normalizeForMatch(s, trimmedName))
    }).length

    const editedCount = comics.filter(c => {
      if (!c.edit) return false
      const editList = c.edit.split(',').map(s => s.trim())
      return editList.some(s => normalizeForMatch(s, trimmedName))
    }).length

    const validComics = comics.filter(c => c.adddate)
    console.log('[getScanlatorStats] Valid comics with adddate:', validComics.length, '/', comics.length)

    const stats: any = {
      total: comics.length,
      realName,
      translatedCount,
      editedCount,
    }

    if (validComics.length > 0) {
      const firstRelease = validComics[0].adddate
      const lastRelease = validComics[validComics.length - 1].adddate
      const daysInScanlating = Math.max(0, Math.floor((lastRelease.getTime() - firstRelease.getTime()) / (1000 * 60 * 60 * 24)))

      stats.firstRelease = firstRelease
      stats.lastRelease = lastRelease
      stats.daysInScanlating = daysInScanlating
    }

    console.log('[getScanlatorStats] Returning stats:', stats)
    return stats
  } catch (error) {
    console.error('Error getting scanlator stats:', error)
    return null
  }
}

export default async function TestKazikZPage() {
  const stats = await getScanlatorStats('KazikZ')

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Test KazikZ Stats</h1>

        <div className="bg-bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Result:</h2>

          {stats ? (
            <div className="space-y-4">
              <div>
                <span className="text-text-secondary">Real Name:</span>{' '}
                <span className="text-text-primary font-medium">{stats.realName}</span>
              </div>
              <div>
                <span className="text-text-secondary">Total Comics:</span>{' '}
                <span className="text-text-primary font-medium">{stats.total}</span>
              </div>
              <div>
                <span className="text-text-secondary">Translated:</span>{' '}
                <span className="text-text-primary font-medium">{stats.translatedCount}</span>
              </div>
              <div>
                <span className="text-text-secondary">Edited:</span>{' '}
                <span className="text-text-primary font-medium">{stats.editedCount}</span>
              </div>
              {stats.firstRelease && (
                <div>
                  <span className="text-text-secondary">First Release:</span>{' '}
                  <span className="text-text-primary font-medium">
                    {new Date(stats.firstRelease).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
              {stats.lastRelease && (
                <div>
                  <span className="text-text-secondary">Last Release:</span>{' '}
                  <span className="text-text-primary font-medium">
                    {new Date(stats.lastRelease).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
              {stats.daysInScanlating !== undefined && (
                <div>
                  <span className="text-text-secondary">Days in Scanlating:</span>{' '}
                  <span className="text-text-primary font-medium">{stats.daysInScanlating}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-tertiary">No stats found (returned null)</p>
          )}
        </div>

        <div className="mt-8 bg-bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Raw JSON:</h2>
          <pre className="bg-bg-tertiary p-4 rounded text-sm overflow-auto">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
