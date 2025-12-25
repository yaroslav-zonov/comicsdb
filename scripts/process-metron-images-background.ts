/**
 * Скрипт для фоновой обработки всех комиксов со старым форматом изображений
 * 
 * Стратегия:
 * - Обрабатывает все комиксы с форматом api/image/
 * - Соблюдает лимиты Metron API (4 сек между запросами = 15 запросов/мин)
 * - Можно запускать в фоне, займет ~5 дней для всех комиксов
 * 
 * Использование:
 *   npx tsx scripts/process-metron-images-background.ts
 *   npx tsx scripts/process-metron-images-background.ts --limit 100  # Обработать только 100
 *   npx tsx scripts/process-metron-images-background.ts --continue   # Продолжить с места остановки
 */

import { prisma } from '../lib/prisma'
import { checkMetronForIssue } from '../lib/metron-api'

const DELAY_BETWEEN_REQUESTS = 4000 // 4 секунды
const REQUESTS_PER_DAY = 21600 // 15 запросов/мин * 60 мин * 24 часа = 21600 (с запасом от 10000)

async function getComicsWithOldFormat(limit?: number) {
  // Ищем комиксы со старым форматом изображений
  const comics = await prisma.comic.findMany({
    where: {
      dateDelete: null,
      OR: [
        { thumb: { contains: 'api/image/' } },
        { tiny: { contains: 'api/image/' } },
        { small: { contains: 'api/image/' } },
        { super: { contains: 'api/image/' } },
      ],
    },
    select: {
      id: true,
      comicvine: true,
      thumb: true,
    },
    take: limit || undefined,
  })

  return comics
}

async function processComics() {
  const args = process.argv.slice(2)
  const limitArg = args.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
  const isContinue = args.includes('--continue')

  console.log('🔍 Поиск комиксов со старым форматом изображений...\n')

  const comics = await getComicsWithOldFormat(limit)
  const totalComics = comics.length

  if (totalComics === 0) {
    console.log('✅ Все комиксы уже обработаны!')
    return
  }

  console.log(`📊 Найдено комиксов: ${totalComics}`)
  console.log(`⏱️  Задержка между запросами: ${DELAY_BETWEEN_REQUESTS}ms`)
  console.log(`⏳ Примерное время: ${Math.ceil(totalComics * DELAY_BETWEEN_REQUESTS / 1000 / 60)} минут`)
  console.log(`📅 При обработке ${REQUESTS_PER_DAY} в день: ~${Math.ceil(totalComics / REQUESTS_PER_DAY)} дней\n`)

  let successCount = 0
  let failCount = 0
  let skippedCount = 0

  for (let i = 0; i < comics.length; i++) {
    const comic = comics[i]
    const comicvineId = comic.comicvine

    console.log(`[${i + 1}/${totalComics}] Обработка ComicVine ID: ${comicvineId}...`)

    try {
      const metronUrl = await checkMetronForIssue(comicvineId)
      
      if (metronUrl) {
        successCount++
        console.log(`  ✅ Найдено в Metron: ${metronUrl.substring(0, 60)}...`)
      } else {
        failCount++
        console.log(`  ⚠️  Не найдено в Metron`)
      }
    } catch (error: any) {
      console.error(`  ❌ Ошибка: ${error.message}`)
      failCount++
    }

    // Задержка между запросами (кроме последнего)
    if (i < comics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS))
    }
  }

  console.log(`\n✅ Завершено:`)
  console.log(`   Найдено в Metron: ${successCount}`)
  console.log(`   Не найдено: ${failCount}`)
  console.log(`   Всего обработано: ${totalComics}`)
  console.log(`\n💡 Для продолжения запустите скрипт снова (он автоматически пропустит уже проверенные)`)
}

processComics()
  .then(() => {
    prisma.$disconnect()
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error)
    prisma.$disconnect()
    process.exit(1)
  })

