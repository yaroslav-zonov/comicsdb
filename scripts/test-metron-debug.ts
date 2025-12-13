// Скрипт для проверки работы Metron API с реальными данными
import { prisma } from '../lib/prisma'
import { getMetronImageUrl } from '../lib/metron'
import { getImageUrl } from '../lib/utils'

async function test() {
  // Получаем несколько комиксов из базы
  const comics = await prisma.comic.findMany({
    where: {
      dateDelete: null,
      comicvine: { gt: 0 },
    },
    take: 3,
    select: {
      id: true,
      comicvine: true,
      thumb: true,
      tiny: true,
    },
  })
  
  console.log(`\n=== Тестирование Metron API ===\n`)
  
  for (const comic of comics) {
    console.log(`\nКомикс ID: ${comic.id}, Comicvine ID: ${comic.comicvine}`)
    console.log(`Comicvine URL: ${comic.thumb?.substring(0, 80)}...`)
    
    // Получаем Metron URL
    const metronUrl = await getMetronImageUrl(comic.comicvine)
    
    // Симулируем логику из кода
    const finalThumb = metronUrl ? metronUrl : getImageUrl(comic.thumb)
    const finalTiny = metronUrl ? metronUrl : getImageUrl(comic.tiny)
    
    console.log(`Metron URL: ${metronUrl ? metronUrl.substring(0, 80) + '...' : 'null (не найден)'}`)
    console.log(`Final thumb URL: ${finalThumb?.substring(0, 80)}...`)
    console.log(`Final tiny URL: ${finalTiny?.substring(0, 80)}...`)
    
    if (finalThumb?.includes('comicvine')) {
      console.log(`❌ ПРОБЛЕМА: Используется Comicvine URL вместо Metron!`)
    } else if (finalThumb?.includes('metron')) {
      console.log(`✅ OK: Используется Metron URL`)
    } else if (!finalThumb) {
      console.log(`⚠️  Нет URL`)
    }
  }
  
  await prisma.$disconnect()
}

test().catch(console.error)

