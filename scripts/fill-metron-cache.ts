/**
 * Скрипт для постепенного заполнения кеша Metron API
 * Учитывает ограничения: 30 запросов/минуту, 10000 запросов/день
 * 
 * Запуск: npx tsx scripts/fill-metron-cache.ts
 */

import { prisma } from '../lib/prisma'

const REQUESTS_PER_MINUTE = 30
const REQUESTS_PER_DAY = 10000
const DELAY_BETWEEN_REQUESTS = (60 * 1000) / REQUESTS_PER_MINUTE // ~2 секунды между запросами

interface Progress {
  total: number
  processed: number
  cached: number
  found: number
  notFound: number
  errors: number
  startTime: Date
  lastRequestTime: Date
  requestsToday: number
}

async function fetchMetronImage(comicvineId: number): Promise<string | null> {
  try {
    const url = `https://metron.cloud/api/v1/issue/?cv_id=${comicvineId}`
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
  } catch (error) {
    return null
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function processBatch(
  comics: Array<{ id: number; comicvine: number }>,
  progress: Progress
): Promise<void> {
  for (const comic of comics) {
    // Проверяем, не превышен ли дневной лимит
    if (progress.requestsToday >= REQUESTS_PER_DAY) {
      console.log(`\n⚠️  Достигнут дневной лимит (${REQUESTS_PER_DAY} запросов)`)
      console.log(`Обработано: ${progress.processed}/${progress.total}`)
      console.log(`Найдено: ${progress.found}, Не найдено: ${progress.notFound}, Ошибок: ${progress.errors}`)
      console.log(`Продолжите завтра или измените лимит`)
      return
    }

    // Проверяем rate limit (30 запросов/минуту)
    const timeSinceLastRequest = Date.now() - progress.lastRequestTime.getTime()
    if (timeSinceLastRequest < DELAY_BETWEEN_REQUESTS) {
      await sleep(DELAY_BETWEEN_REQUESTS - timeSinceLastRequest)
    }

    try {
      const imageUrl = await fetchMetronImage(comic.comicvine)
      progress.lastRequestTime = new Date()
      progress.requestsToday++

      if (imageUrl) {
        await prisma.comic.update({
          where: { id: comic.id },
          data: { metronImageUrl: imageUrl },
        })
        progress.found++
        console.log(`✅ [${progress.processed + 1}/${progress.total}] Comic ${comic.id} (cv: ${comic.comicvine}) - найдено`)
      } else {
        // Сохраняем пустую строку чтобы не запрашивать повторно
        await prisma.comic.update({
          where: { id: comic.id },
          data: { metronImageUrl: '' },
        })
        progress.notFound++
        console.log(`❌ [${progress.processed + 1}/${progress.total}] Comic ${comic.id} (cv: ${comic.comicvine}) - не найдено`)
      }
    } catch (error: any) {
      progress.errors++
      console.error(`⚠️  [${progress.processed + 1}/${progress.total}] Comic ${comic.id} - ошибка:`, error.message)
    }

    progress.processed++

    // Показываем прогресс каждые 100 комиксов
    if (progress.processed % 100 === 0) {
      const elapsed = (Date.now() - progress.startTime.getTime()) / 1000
      const rate = progress.processed / elapsed
      const remaining = progress.total - progress.processed
      const eta = remaining / rate
      
      console.log(`\n📊 Прогресс: ${progress.processed}/${progress.total} (${((progress.processed / progress.total) * 100).toFixed(1)}%)`)
      console.log(`   Найдено: ${progress.found}, Не найдено: ${progress.notFound}, Ошибок: ${progress.errors}`)
      console.log(`   Скорость: ${rate.toFixed(2)} комиксов/сек`)
      console.log(`   Запросов сегодня: ${progress.requestsToday}/${REQUESTS_PER_DAY}`)
      console.log(`   Осталось: ~${Math.round(eta / 60)} минут`)
      console.log(`   ETA: ~${Math.round(eta / 3600)} часов до завершения\n`)
    }
  }
}

async function main() {
  console.log('🚀 Запуск заполнения кеша Metron API\n')
  console.log(`Ограничения:`)
  console.log(`  - ${REQUESTS_PER_MINUTE} запросов/минуту`)
  console.log(`  - ${REQUESTS_PER_DAY} запросов/день\n`)

  // Получаем все комиксы без кеша Metron
  const total = await prisma.comic.count({
    where: {
      dateDelete: null,
      comicvine: { gt: 0 },
      OR: [
        { metronImageUrl: null },
        { metronImageUrl: '' },
      ],
    },
  })

  console.log(`Найдено комиксов без кеша Metron: ${total}\n`)

  if (total === 0) {
    console.log('✅ Все комиксы уже обработаны!')
    await prisma.$disconnect()
    return
  }

  const progress: Progress = {
    total,
    processed: 0,
    cached: 0,
    found: 0,
    notFound: 0,
    errors: 0,
    startTime: new Date(),
    lastRequestTime: new Date(),
    requestsToday: 0,
  }

  // Обрабатываем батчами по 1000 для оптимизации памяти
  const BATCH_SIZE = 1000
  let offset = 0

  while (offset < total && progress.requestsToday < REQUESTS_PER_DAY) {
    const comics = await prisma.comic.findMany({
      where: {
        dateDelete: null,
        comicvine: { gt: 0 },
        OR: [
          { metronImageUrl: null },
          { metronImageUrl: '' },
        ],
      },
      select: {
        id: true,
        comicvine: true,
      },
      take: BATCH_SIZE,
      skip: offset,
      orderBy: { id: 'asc' },
    })

    if (comics.length === 0) break

    await processBatch(comics, progress)
    offset += BATCH_SIZE
  }

  console.log('\n✅ Завершено!')
  console.log(`Обработано: ${progress.processed}/${progress.total}`)
  console.log(`Найдено: ${progress.found}`)
  console.log(`Не найдено: ${progress.notFound}`)
  console.log(`Ошибок: ${progress.errors}`)
  console.log(`Запросов использовано: ${progress.requestsToday}/${REQUESTS_PER_DAY}`)
  
  const elapsed = (Date.now() - progress.startTime.getTime()) / 1000
  console.log(`Время выполнения: ${Math.round(elapsed / 60)} минут`)

  await prisma.$disconnect()
}

main().catch(console.error)

