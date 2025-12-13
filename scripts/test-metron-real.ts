// Тестовый скрипт для проверки Metron API с реальными ID из базы
import { prisma } from '../lib/prisma'

async function testMetron() {
  // Получаем несколько комиксов из базы
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
    },
  })
  
  console.log(`Найдено ${comics.length} комиксов для тестирования\n`)
  
  for (const comic of comics) {
    try {
      console.log(`\nТестирую комикс ID: ${comic.id}, comicvine: ${comic.comicvine}`)
      console.log(`Comicvine URL: ${comic.thumb?.substring(0, 80)}...`)
      
      const response = await fetch(
        `https://metron.cloud/api/v1/issue/?cv_id=${comic.comicvine}`,
        {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        }
      )
      
      console.log(`Metron Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`Results count: ${data.results?.length || 0}`)
        if (data.results && data.results.length > 0) {
          const issue = data.results[0]
          console.log(`✅ Metron Image URL: ${issue.image || 'null'}`)
          console.log(`Issue name: ${issue.name || 'N/A'}`)
        } else {
          console.log('❌ No results found in Metron')
        }
      } else {
        const text = await response.text()
        console.log(`❌ Error: ${text.substring(0, 100)}`)
      }
    } catch (error) {
      console.error(`❌ Error:`, error)
    }
  }
  
  await prisma.$disconnect()
}

testMetron().catch(console.error)

