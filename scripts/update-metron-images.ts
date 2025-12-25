/**
 * Скрипт для массового обновления соответствий ComicVine ID -> Metron URL
 * 
 * Использование:
 *   npx tsx scripts/update-metron-images.ts
 * 
 * Или с данными:
 *   npx tsx scripts/update-metron-images.ts --add "4050-12345:https://metron.cloud/..."
 */

import fs from 'fs'
import path from 'path'

type MetronImageSizes = {
  thumb?: string
  tiny?: string
  small?: string
  super?: string
}

type MetronMappings = {
  [comicvineId: string]: MetronImageSizes
}

type MetronImagesData = {
  version: string
  lastUpdated: string
  mappings: MetronMappings
}

const DATA_FILE = path.join(process.cwd(), 'data', 'metron-images.json')

/**
 * Загружает текущие соответствия из JSON файла
 */
function loadMappings(): MetronMappings {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as MetronImagesData
      return data.mappings || {}
    }
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error)
  }
  return {}
}

/**
 * Сохраняет соответствия в JSON файл
 */
function saveMappings(mappings: MetronMappings) {
  const data: MetronImagesData = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    mappings,
  }

  // Создаём директорию, если её нет
  const dataDir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✅ Сохранено ${Object.keys(mappings).length} соответствий в ${DATA_FILE}`)
}

/**
 * Добавляет новое соответствие
 */
function addMapping(
  comicvineId: string,
  thumb?: string,
  tiny?: string,
  small?: string,
  superImage?: string
) {
  const mappings = loadMappings()
  
  mappings[comicvineId] = {
    ...(thumb && { thumb }),
    ...(tiny && { tiny }),
    ...(small && { small }),
    ...(superImage && { super: superImage }),
  }

  saveMappings(mappings)
  console.log(`✅ Добавлено соответствие для ComicVine ID: ${comicvineId}`)
}

/**
 * Удаляет соответствие
 */
function removeMapping(comicvineId: string) {
  const mappings = loadMappings()
  
  if (comicvineId in mappings) {
    delete mappings[comicvineId]
    saveMappings(mappings)
    console.log(`✅ Удалено соответствие для ComicVine ID: ${comicvineId}`)
  } else {
    console.log(`⚠️  Соответствие для ComicVine ID ${comicvineId} не найдено`)
  }
}

/**
 * Показывает статистику
 */
function showStats() {
  const mappings = loadMappings()
  const count = Object.keys(mappings).length
  
  console.log(`\n📊 Статистика соответствий Metron:`)
  console.log(`   Всего соответствий: ${count}`)
  
  if (count > 0) {
    const withThumb = Object.values(mappings).filter(m => m.thumb).length
    const withSuper = Object.values(mappings).filter(m => m.super).length
    console.log(`   С thumb: ${withThumb}`)
    console.log(`   С super: ${withSuper}`)
    
    console.log(`\n   Примеры ComicVine ID:`)
    Object.keys(mappings).slice(0, 5).forEach(id => {
      console.log(`   - ${id}`)
    })
  }
}

// Основная функция
function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    showStats()
    console.log(`\n📝 Использование:`)
    console.log(`   npx tsx scripts/update-metron-images.ts --stats          # Показать статистику`)
    console.log(`   npx tsx scripts/update-metron-images.ts --add "ID:URL"     # Добавить соответствие`)
    console.log(`   npx tsx scripts/update-metron-images.ts --remove "ID"      # Удалить соответствие`)
    return
  }

  const command = args[0]

  if (command === '--stats') {
    showStats()
  } else if (command === '--add' && args[1]) {
    // Простой формат: "4050-12345:https://metron.cloud/..."
    const [id, url] = args[1].split(':')
    if (id && url) {
      // Определяем размер по URL
      let size: 'thumb' | 'tiny' | 'small' | 'super' = 'thumb'
      if (url.includes('/thumb/')) size = 'thumb'
      else if (url.includes('/tiny/')) size = 'tiny'
      else if (url.includes('/small/')) size = 'small'
      else if (url.includes('/super/')) size = 'super'
      
      addMapping(id, 
        size === 'thumb' ? url : undefined,
        size === 'tiny' ? url : undefined,
        size === 'small' ? url : undefined,
        size === 'super' ? url : undefined
      )
    } else {
      console.error('❌ Неверный формат. Используйте: --add "ID:URL"')
    }
  } else if (command === '--remove' && args[1]) {
    removeMapping(args[1])
  } else {
    console.error('❌ Неизвестная команда:', command)
    console.log('Используйте --stats, --add или --remove')
  }
}

main()

