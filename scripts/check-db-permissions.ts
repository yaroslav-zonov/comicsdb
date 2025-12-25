/**
 * Скрипт для проверки прав пользователя БД
 * Проверяет возможность создания таблиц и записи данных
 */

import { prisma } from '../lib/prisma'

async function checkPermissions() {
  console.log('🔍 Проверка прав пользователя БД...\n')

  try {
    // 1. Проверка текущих прав пользователя
    console.log('1️⃣ Проверка текущих прав пользователя:')
    const grants = await prisma.$queryRaw<Array<{ Grant: string }>>`
      SHOW GRANTS FOR CURRENT_USER()
    `
    console.log('Текущие права:')
    grants.forEach((grant) => {
      console.log(`   ${grant.Grant}`)
    })
    console.log('')

    // 2. Проверка прав на создание таблиц
    console.log('2️⃣ Попытка создать тестовую таблицу:')
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS test_permissions_check (
          id INT AUTO_INCREMENT PRIMARY KEY,
          test_data VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      console.log('   ✅ Успешно создана таблица test_permissions_check')
    } catch (error: any) {
      console.log(`   ❌ Ошибка создания таблицы: ${error.message}`)
    }
    console.log('')

    // 3. Проверка прав на запись данных
    console.log('3️⃣ Попытка записать данные в тестовую таблицу:')
    try {
      await prisma.$executeRaw`
        INSERT INTO test_permissions_check (test_data)
        VALUES ('test permission check')
      `
      console.log('   ✅ Успешно записаны данные в test_permissions_check')
    } catch (error: any) {
      console.log(`   ❌ Ошибка записи данных: ${error.message}`)
    }
    console.log('')

    // 4. Проверка прав на чтение данных
    console.log('4️⃣ Проверка чтения данных из тестовой таблицы:')
    try {
      const result = await prisma.$queryRaw<Array<{ id: number; test_data: string }>>`
        SELECT id, test_data FROM test_permissions_check LIMIT 1
      `
      console.log(`   ✅ Успешно прочитаны данные: ${JSON.stringify(result[0])}`)
    } catch (error: any) {
      console.log(`   ❌ Ошибка чтения данных: ${error.message}`)
    }
    console.log('')

    // 5. Проверка прав на удаление таблицы
    console.log('5️⃣ Попытка удалить тестовую таблицу:')
    try {
      await prisma.$executeRaw`
        DROP TABLE IF EXISTS test_permissions_check
      `
      console.log('   ✅ Успешно удалена таблица test_permissions_check')
    } catch (error: any) {
      console.log(`   ❌ Ошибка удаления таблицы: ${error.message}`)
      console.log('   ⚠️  Таблица test_permissions_check осталась в БД')
    }
    console.log('')

    // 6. Проверка прав на создание индексов (должно быть запрещено)
    console.log('6️⃣ Попытка создать индекс (ожидается ошибка):')
    try {
      await prisma.$executeRaw`
        CREATE INDEX test_idx ON cdb_comics(id)
      `
      console.log('   ⚠️  Неожиданно: индекс создан (это не должно было произойти)')
    } catch (error: any) {
      console.log(`   ✅ Ожидаемая ошибка создания индекса: ${error.message}`)
    }
    console.log('')

    // 7. Проверка прав на ALTER TABLE (должно быть запрещено)
    console.log('7️⃣ Попытка изменить таблицу (ожидается ошибка):')
    try {
      await prisma.$executeRaw`
        ALTER TABLE cdb_comics ADD COLUMN test_column INT
      `
      console.log('   ⚠️  Неожиданно: таблица изменена (это не должно было произойти)')
      // Откатываем изменение
      await prisma.$executeRaw`
        ALTER TABLE cdb_comics DROP COLUMN test_column
      `
    } catch (error: any) {
      console.log(`   ✅ Ожидаемая ошибка изменения таблицы: ${error.message}`)
    }
    console.log('')

    // 8. Проверка прав на запись в существующие таблицы
    console.log('8️⃣ Попытка записать данные в существующую таблицу (cdb_comics):')
    try {
      // Пробуем обновить запись (не создавать новую, чтобы не нарушить целостность)
      const result = await prisma.$executeRaw`
        UPDATE cdb_comics 
        SET id = id 
        WHERE id = (SELECT MIN(id) FROM (SELECT id FROM cdb_comics LIMIT 1) AS t)
        LIMIT 1
      `
      console.log(`   ✅ Успешно выполнено обновление (затронуто строк: ${result})`)
    } catch (error: any) {
      console.log(`   ❌ Ошибка обновления данных: ${error.message}`)
    }
    console.log('')

    console.log('✅ Проверка прав завершена!')
  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkPermissions()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Ошибка выполнения скрипта:', error)
    process.exit(1)
  })

