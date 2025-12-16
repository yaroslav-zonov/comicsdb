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

    // Используем стандартный Prisma ORM вместо raw SQL
    // Не загружаем даты сразу из-за невалидных значений в БД (P2020)
    const allComics = await prisma.comic.findMany({
      where: {
        dateDelete: null,
        OR: [
          { translate: { contains: trimmedName } },
          { edit: { contains: trimmedName } }
        ]
      },
      select: {
        id: true,
        translate: true,
        edit: true,
      },
    })

    // Фильтруем точно по имени в списке (case-insensitive)
    const matchScanlator = (field: string | null): boolean => {
      if (!field) return false
      const names = field.split(',').map(s => s.trim())
      return names.some(name => name.toLowerCase() === lowerQuery)
    }

    const filteredComics = allComics.filter(c =>
      matchScanlator(c.translate) || matchScanlator(c.edit)
    )

    console.log('[getScanlatorStats] Found comics:', filteredComics.length)

    if (filteredComics.length === 0) {
      console.log('[getScanlatorStats] No comics found for:', trimmedName)
      return null
    }

    // Загружаем даты отдельно через raw SQL (безопасно обрабатываем невалидные даты)
    const comicIds = filteredComics.map(c => c.id)
    const datesRaw = await prisma.$queryRaw<Array<{
      id: number
      date: string | null
      adddate: string | null
    }>>`
      SELECT id,
        CASE WHEN date = '0000-00-00' THEN NULL ELSE date END as date,
        CASE WHEN adddate = '0000-00-00' THEN NULL ELSE adddate END as adddate
      FROM cdb_comics
      WHERE id IN (${Prisma.join(comicIds)})
      ORDER BY adddate ASC
    `

    // Создаём map с датами
    const datesMap = new Map(datesRaw.map(d => [
      d.id,
      {
        date: d.date ? new Date(d.date) : null,
        adddate: d.adddate ? new Date(d.adddate) : null,
      }
    ]))

    // Добавляем даты к комиксам и сортируем по adddate
    const comics = filteredComics
      .map(c => ({
        ...c,
        ...datesMap.get(c.id)
      }))
      .sort((a, b) => (a.adddate?.getTime() || 0) - (b.adddate?.getTime() || 0))

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

      if (firstRelease && lastRelease) {
        const daysInScanlating = Math.max(0, Math.floor((lastRelease.getTime() - firstRelease.getTime()) / (1000 * 60 * 60 * 24)))

        stats.firstRelease = firstRelease
        stats.lastRelease = lastRelease
        stats.daysInScanlating = daysInScanlating
      }
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
