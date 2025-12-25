/**
 * Скрипт для проверки статуса системы Metron
 * Показывает статистику кэша и последние добавленные записи
 */

import { getCacheStats } from '../lib/metron-api'

async function main() {
  console.log('📊 Статус системы Metron\n')

  // Получаем статистику из кэша (KV или памяти)
  const stats = await getCacheStats()

  console.log('📈 Статистика:')
  console.log(`   Найдено в Metron: ${stats.cachedCount}`)
  console.log(`   Проверено всего: ${stats.checkedCount}`)
  console.log(`   Последнее обновление: ${stats.lastUpdated || 'неизвестно'}`)
  console.log(`   Хранилище: ${process.env.KV_REST_API_URL ? 'Vercel KV' : 'In-Memory'}\n`)

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

  // Инструкции
  console.log('💡 Как проверить работу:')
  console.log('   1. Откройте страницу комикса со старым форматом изображения')
  console.log('   2. Подождите несколько секунд (запрос к Metron API)')
  console.log('   3. Запустите этот скрипт снова - должны появиться новые записи')
  console.log('   4. Или проверьте API: http://localhost:3000/api/metron/status\n')

  if (!process.env.KV_REST_API_URL) {
    console.log('⚠️  Vercel KV не настроен - используется in-memory кэш')
    console.log('   Для персистентного хранилища настройте Vercel KV\n')
  }
}

main()

