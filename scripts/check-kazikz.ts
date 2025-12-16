import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Проверяем комикс с ID 31070, который упомянул пользователь
  console.log('=== Checking comic ID 31070 ===')
  const comic31070 = await prisma.comic.findUnique({
    where: { id: 31070 },
    select: {
      id: true,
      translate: true,
      edit: true,
      adddate: true,
      comicvine: true,
      number: true,
    },
  })

  if (comic31070) {
    console.log('Comic found:')
    console.log('ID:', comic31070.id)
    console.log('ComicVine:', comic31070.comicvine)
    console.log('Number:', comic31070.number)
    console.log('Adddate:', comic31070.adddate)
    console.log('Translate:', comic31070.translate)
    console.log('Edit:', comic31070.edit)
    console.log()

    // Проверяем, есть ли "KazikZ" в списках
    if (comic31070.translate) {
      const translateList = comic31070.translate.split(',').map(s => s.trim())
      console.log('Translate list:', translateList)
      const hasKazikZ = translateList.some(s => s.toLowerCase() === 'kazikz')
      console.log('Has "kazikz" in translate:', hasKazikZ)
      console.log()
    }

    if (comic31070.edit) {
      const editList = comic31070.edit.split(',').map(s => s.trim())
      console.log('Edit list:', editList)
      const hasKazikZ = editList.some(s => s.toLowerCase() === 'kazikz')
      console.log('Has "kazikz" in edit:', hasKazikZ)
      console.log()
    }
  } else {
    console.log('Comic 31070 not found!')
  }

  // Теперь давайте поищем все комиксы с KazikZ используя ту же логику, что в коде
  console.log('=== Searching for KazikZ using same SQL pattern ===')
  const lowerQuery = 'kazikz'

  const comics = await prisma.$queryRaw<Array<{
    id: number
    adddate: Date
    translate: string
    edit: string
  }>>`
    SELECT c.id, c.adddate, c.translate, c.edit
    FROM cdb_comics c
    WHERE c.date_delete IS NULL
      AND (
        LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT(${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery})
        OR LOWER(REPLACE(c.translate, ', ', ',')) = ${lowerQuery}
        OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT(${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery})
        OR LOWER(REPLACE(c.edit, ', ', ',')) = ${lowerQuery}
      )
    ORDER BY c.adddate ASC
    LIMIT 5
  `

  console.log('Found', comics.length, 'comics')
  if (comics.length > 0) {
    console.log('First 5 comics:')
    comics.forEach(c => {
      console.log(`- ID: ${c.id}, Adddate: ${c.adddate}, Translate: ${c.translate?.substring(0, 50)}, Edit: ${c.edit?.substring(0, 50)}`)
    })
  }

  // Также проверим, сколько всего комиксов с KazikZ
  console.log('\n=== Total count ===')
  const allComics = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM cdb_comics c
    WHERE c.date_delete IS NULL
      AND (
        LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT(${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.translate, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery})
        OR LOWER(REPLACE(c.translate, ', ', ',')) = ${lowerQuery}
        OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT(${lowerQuery}, ',%')
        OR LOWER(REPLACE(c.edit, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery})
        OR LOWER(REPLACE(c.edit, ', ', ',')) = ${lowerQuery}
      )
  `

  console.log('Total comics with KazikZ:', Number(allComics[0].count))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
