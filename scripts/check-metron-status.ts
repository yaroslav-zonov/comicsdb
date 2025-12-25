/**
 * Скрипт для проверки статуса системы Metron
 * Показывает статистику кэша и последние добавленные записи
 */

import { getCacheStats } from '../lib/metron-api'
import fs from 'fs'
import path from 'path'

const CACHE_INDEX_FILE = path.join(process.cwd(), 'data', 'metron-cache-index.json')

function loadCacheIndex() {
  try {
    if (fs.existsSync(CACHE_INDEX_FILE)) {
      const data = fs.readFileSync(CACHE_INDEX_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Ошибка при загрузке индекса:', error)
  }
  return null
}

function main() {
  console.log('📊 Статус системы Metron\n')

  // Получаем статистику из кэша
  const stats = getCacheStats()
  const index = loadCacheIndex()

  console.log('📈 Статистика:')
  console.log(`   Найдено в Metron: ${stats.cachedCount}`)
  console.log(`   Проверено всего: ${stats.checkedCount}`)
  console.log(`   Последнее обновление: ${index?.lastUpdated || 'неизвестно'}\n`)

  // Показываем последние добавленные записи
  if (stats.cachedCount > 0) {
    console.log('🖼️  Последние найденные изображения:')
    const cachedEntries = Object.entries(stats.cachedImages).slice(-10)
    cachedEntries.forEach(([id, url]) => {
      console.log(`   ${id}: ${(url as string).substring(0, 60)}...`)
    })
    console.log('')
  }

  // Показываем примеры проверенных, но не найденных
  if (stats.checkedCount > stats.cachedCount) {
    const notFoundCount = stats.checkedCount - stats.cachedCount
    console.log(`⚠️  Проверено, но не найдено в Metron: ${notFoundCount}\n`)
  }

  // Показываем размер файла
  if (fs.existsSync(CACHE_INDEX_FILE)) {
    const stats = fs.statSync(CACHE_INDEX_FILE)
    const sizeKB = (stats.size / 1024).toFixed(2)
    console.log(`📁 Размер файла кэша: ${sizeKB} KB\n`)
  }

  // Инструкции
  console.log('💡 Как проверить работу:')
  console.log('   1. Откройте страницу комикса со старым форматом изображения')
  console.log('   2. Подождите несколько секунд (запрос к Metron API)')
  console.log('   3. Запустите этот скрипт снова - должны появиться новые записи')
  console.log('   4. Или проверьте файл data/metron-cache-index.json\n')

  console.log('🔍 Для просмотра всех записей:')
  console.log('   cat data/metron-cache-index.json | jq')
}

main()

