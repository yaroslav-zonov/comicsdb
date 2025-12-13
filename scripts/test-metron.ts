// Тестовый скрипт для проверки Metron API
async function testMetron() {
  // Тестируем с реальным comicvine ID из базы
  const testIds = [4000, 4001, 4002, 4003, 4004]
  
  for (const id of testIds) {
    try {
      console.log(`\nТестирую comicvine ID: ${id}`)
      const response = await fetch(
        `https://metron.cloud/api/v1/issue/?cv_id=${id}`,
        {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        }
      )
      
      console.log(`Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`Results count: ${data.results?.length || 0}`)
        if (data.results && data.results.length > 0) {
          const issue = data.results[0]
          console.log(`Image URL: ${issue.image || 'null'}`)
          console.log(`Issue ID: ${issue.id}`)
          console.log(`Issue name: ${issue.name || 'N/A'}`)
        } else {
          console.log('No results found')
        }
      } else {
        const text = await response.text()
        console.log(`Error response: ${text.substring(0, 200)}`)
      }
    } catch (error) {
      console.error(`Error for ID ${id}:`, error)
    }
  }
}

testMetron()

