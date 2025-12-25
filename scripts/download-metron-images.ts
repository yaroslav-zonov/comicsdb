/**
 * Скрипт для загрузки и кэширования изображений Metron
 * 
 * Учитывает лимиты API:
 * - 30 запросов в минуту (1 запрос каждые 2 секунды)
 * - 10000 запросов в день
 * 
 * Использование:
 *   npx tsx scripts/download-metron-images.ts --ids "4050-12345,4050-67890"
 *   npx tsx scripts/download-metron-images.ts --popular 100
 *   npx tsx scripts/download-metron-images.ts --continue
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import { prisma } from '../lib/prisma'

const METRON_API_BASE = 'https://metron.cloud/api/v1/issue/'
const METRON_IMAGE_BASE = 'https://metron.cloud/media/image/'

// Лимиты API
const REQUESTS_PER_MINUTE = 30
const REQUESTS_PER_DAY = 10000
const DELAY_BETWEEN_REQUESTS = 2500 // 2.5 секунды (безопасный запас)

const PUBLIC_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'metron')
const CACHE_INDEX_FILE = path.join(process.cwd(), 'data', 'metron-cache-index.json')

type MetronCacheIndex = {
  version: string
  lastUpdated: string
  cachedIds: string[]
}

/**
 * Загружает индекс кэша
 */
function loadCacheIndex(): MetronCacheIndex {
  try {
    if (fs.existsSync(CACHE_INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_INDEX_FILE, 'utf-8'))
    }
  } catch (error) {
    console.error('Ошибка при загрузке индекса:', error)
  }
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    cachedIds: [],
  }
}

/**
 * Сохраняет индекс кэша
 */
function saveCacheIndex(index: MetronCacheIndex) {
  fs.writeFileSync(CACHE_INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8')
}

/**
 * Скачивает файл по URL
 */
function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath)
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      } else if (response.statusCode === 404) {
        // Изображение не найдено - это нормально
        file.close()
        fs.unlinkSync(filePath) // Удаляем пустой файл
        resolve()
      } else {
        file.close()
        fs.unlinkSync(filePath)
        reject(new Error(`HTTP ${response.statusCode}: ${url}`))
      }
    }).on('error', (err) => {
      file.close()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      reject(err)
    })
  })
}

/**
 * Загружает изображение Metron для комикса
 */
async function downloadMetronImages(comicvineId: string): Promise<boolean> {
  const id = comicvineId.replace(/^4050-/, '') // Убираем префикс, если есть
  
  const sizes = ['thumb', 'tiny', 'small', 'super'] as const
  let successCount = 0

  for (const size of sizes) {
    const url = `${METRON_IMAGE_BASE}${size}/${id}.jpg`
    const dir = path.join(PUBLIC_IMAGES_DIR, size)
    const filePath = path.join(dir, `${comicvineId}.jpg`)

    // Создаём директорию, если её нет
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    try {
      await downloadFile(url, filePath)
      successCount++
      console.log(`  ✅ ${size}: ${comicvineId}`)
    } catch (error: any) {
      console.log(`  ⚠️  ${size}: ${error.message}`)
    }
  }

  // Считаем успешным, если загружено хотя бы одно изображение
  return successCount > 0
}

/**
 * Задержка между запросами
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Получает популярные комиксы из БД
 */
async function getPopularComics(limit: number): Promise<string[]> {
  const comics = await prisma.comic.findMany({
    where: {
      dateDelete: null,
    },
    select: {
      comicvine: true,
    },
    orderBy: {
      downloaded: 'desc', // Самые скачанные
    },
    take: limit,
  })

  return comics.map(c => String(c.comicvine))
}

/**
 * Основная функция
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('📥 Скрипт загрузки изображений Metron\n')
    console.log('Использование:')
    console.log('  --ids "4050-12345,4050-67890"     # Загрузить для указанных ID')
    console.log('  --popular 100                      # Загрузить для 100 популярных комиксов')
    console.log('  --continue                         # Продолжить загрузку (из индекса)')
    return
  }

  const index = loadCacheIndex()
  const cachedSet = new Set(index.cachedIds)
  let idsToDownload: string[] = []

  const command = args[0]

  if (command === '--ids' && args[1]) {
    idsToDownload = args[1].split(',').map(id => id.trim())
  } else if (command === '--popular' && args[1]) {
    const limit = parseInt(args[1])
    if (isNaN(limit)) {
      console.error('❌ Неверный лимит:', args[1])
      return
    }
    console.log(`📊 Получение ${limit} популярных комиксов из БД...`)
    idsToDownload = await getPopularComics(limit)
  } else if (command === '--continue') {
    // Продолжить загрузку - нужно реализовать логику сохранения прогресса
    console.log('⚠️  Функция --continue пока не реализована')
    return
  } else {
    console.error('❌ Неизвестная команда:', command)
    return
  }

  // Фильтруем уже закэшированные
  idsToDownload = idsToDownload.filter(id => !cachedSet.has(id))

  if (idsToDownload.length === 0) {
    console.log('✅ Все указанные комиксы уже закэшированы')
    return
  }

  console.log(`\n📥 Загрузка ${idsToDownload.length} изображений...`)
  console.log(`⏱️  Задержка между запросами: ${DELAY_BETWEEN_REQUESTS}ms`)
  console.log(`⏳ Примерное время: ${Math.ceil(idsToDownload.length * DELAY_BETWEEN_REQUESTS / 1000 / 60)} минут\n`)

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < idsToDownload.length; i++) {
    const comicvineId = idsToDownload[i]
    console.log(`[${i + 1}/${idsToDownload.length}] Загрузка ${comicvineId}...`)

    try {
      const success = await downloadMetronImages(comicvineId)
      if (success) {
        successCount++
        cachedSet.add(comicvineId)
        index.cachedIds = Array.from(cachedSet)
        index.lastUpdated = new Date().toISOString().split('T')[0]
        saveCacheIndex(index)
      } else {
        failCount++
      }
    } catch (error: any) {
      console.error(`  ❌ Ошибка: ${error.message}`)
      failCount++
    }

    // Задержка между запросами (кроме последнего)
    if (i < idsToDownload.length - 1) {
      await delay(DELAY_BETWEEN_REQUESTS)
    }
  }

  console.log(`\n✅ Завершено:`)
  console.log(`   Успешно: ${successCount}`)
  console.log(`   Ошибок: ${failCount}`)
  console.log(`   Всего в кэше: ${cachedSet.size}`)
}

main()
  .then(() => {
    prisma.$disconnect()
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error)
    prisma.$disconnect()
    process.exit(1)
  })

