/**
 * Вспомогательные функции для оптимизации поиска
 */

import { Prisma } from '@prisma/client'

/**
 * Генерирует ORDER BY clause для SQL запросов на основе параметра сортировки
 */
export function getOrderByClause(sort: string): string {
  switch (sort) {
    case 'name_asc':
      return 's.name ASC'
    case 'name_desc':
      return 's.name DESC'
    case 'date_asc':
      return 'c.pdate ASC'
    case 'date_desc':
      return 'c.pdate DESC'
    case 'translation_date_asc':
      return 'COALESCE(c.date, c.pdate) ASC'
    case 'translation_date_desc':
      return 'COALESCE(c.date, c.pdate) DESC'
    default:
      return 'c.adddate DESC'
  }
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
