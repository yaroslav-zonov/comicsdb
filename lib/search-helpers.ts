/**
 * Вспомогательные функции для оптимизации поиска
 */

import { Prisma } from '@prisma/client'

/**
 * Генерирует ORDER BY clause для SQL запросов на основе параметра сортировки
 * Использует whitelist для защиты от SQL injection
 */
export function getOrderByClause(sort: string): string {
  const validSorts: Record<string, string> = {
    'name_asc': 's.name ASC',
    'name_desc': 's.name DESC',
    'date_asc': 'c.pdate ASC',
    'date_desc': 'c.pdate DESC',
    'translation_date_asc': 'COALESCE(c.date, c.pdate) ASC',
    'translation_date_desc': 'COALESCE(c.date, c.pdate) DESC',
    'adddate_desc': 'c.adddate DESC',
  }

  return validSorts[sort] || 'c.adddate DESC'
}

/**
 * Создаёт SQL условие для поиска в CSV-списках (translate, edit)
 * Ищет без учёта регистра
 */
export function createCsvSearchCondition(
  field: string,
  query: string
): Prisma.Sql {
  const lowerQuery = query.toLowerCase()

  return Prisma.sql`(
    LOWER(REPLACE(${Prisma.raw(field)}, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery}, ',%')
    OR LOWER(REPLACE(${Prisma.raw(field)}, ', ', ',')) LIKE CONCAT(${lowerQuery}, ',%')
    OR LOWER(REPLACE(${Prisma.raw(field)}, ', ', ',')) LIKE CONCAT('%,', ${lowerQuery})
    OR LOWER(REPLACE(${Prisma.raw(field)}, ', ', ',')) = ${lowerQuery}
  )`
}

/**
 * Извлекает реальное имя из CSV-списка (translate или edit)
 * Ищет без учёта регистра, возвращает с оригинальным регистром
 */
export function extractNameFromCsv(csvString: string, searchQuery: string): string | null {
  const items = csvString.split(',').map(s => s.trim())

  // Сначала ищем точное совпадение
  const exactMatch = items.find(item => item === searchQuery)
  if (exactMatch) return exactMatch

  // Затем без учёта регистра
  const caseInsensitiveMatch = items.find(
    item => item.toLowerCase() === searchQuery.toLowerCase()
  )

  return caseInsensitiveMatch || null
}

/**
 * Нормализует параметр страницы
 */
export function normalizePage(pageParam?: string): number {
  const page = parseInt(pageParam || '1', 10)
  return isNaN(page) || page < 1 ? 1 : page
}

/**
 * Нормализует параметр сортировки
 */
export function normalizeSort(sortParam?: string, defaultSort: string = 'relevance'): string {
  const validSorts = [
    'relevance',
    'name_asc',
    'name_desc',
    'date_asc',
    'date_desc',
    'translation_date_asc',
    'translation_date_desc',
    'adddate_desc',
  ]

  return validSorts.includes(sortParam || '') ? sortParam! : defaultSort
}
