# Рефакторинг app/search/page.tsx

## Проблема

Файл: **1224 строки** - слишком большой!

### Дублированные функции:

| Функция | Строки | Поля поиска | Запросов |
|---------|--------|-------------|----------|
| searchByCharacters | 367-416 | characters | 2 (SELECT + COUNT) |
| searchByCreators | 421-470 | creators | 2 (SELECT + COUNT) |
| searchByTeams | 485-534 | teams | 2 (SELECT + COUNT) |
| searchByScanlators | 539-588 | translate, edit | 2 (SELECT + COUNT) |

**Итого:** ~200 строк дублированного кода

## Решение

### Вариант 1: Использовать lib/search-queries.ts (РЕКОМЕНДУЕТСЯ)

```typescript
// В app/search/page.tsx заменить функции на:
import { searchComicsByField } from '@/lib/search-queries'

// Обёртки для совместимости:
async function searchByCharacters(query: string, page: number = 1, sort: string = 'adddate_desc') {
  return searchComicsByField('characters', query, page, sort)
}

async function searchByCreators(query: string, page: number = 1, sort: string = 'adddate_desc') {
  return searchComicsByField('creators', query, page, sort)
}

async function searchByTeams(query: string, page: number = 1, sort: string = 'adddate_desc') {
  return searchComicsByField('teams', query, page, sort)
}

async function searchByScanlators(query: string, page: number = 1, sort: string = 'adddate_desc') {
  return searchComicsByField('translate', query, page, sort)
}
```

**Результат:** 1224 → ~1050 строк (сокращение ~15%)

### Вариант 2: Разделить файл на модули (ДОЛГОСРОЧНО)

Структура:
```
lib/
  search/
    series.ts       - searchSeries()
    characters.ts   - обёртка над searchComicsByField
    creators.ts     - обёртка над searchComicsByField
    teams.ts        - обёртка над searchComicsByField
    scanlators.ts   - обёртка над searchComicsByField
    helpers.ts      - processComicSearchResults(), getGlobalComicIds()
```

## Технические отличия

### Текущая реализация (search/page.tsx):
- ✅ FIND_IN_SET() - точное совпадение в CSV
- ❌ 2 запроса (SELECT + COUNT)
- ❌ Обрабатывает encodeHtmlEntities

### Новая (searchComicsByField):
- ✅ COUNT(*) OVER() - 1 запрос
- ✅ Использует createCsvSearchCondition() - готова к FULLTEXT
- ❌ LIKE вместо FIND_IN_SET (после добавления индексов будет MATCH AGAINST)

## Риски

1. **FIND_IN_SET vs LIKE** - разные результаты поиска
   - Решение: Протестировать на production данных

2. **encodeHtmlEntities** - не учитывается
   - Решение: Добавить в searchComicsByField опциональный параметр

## Следующие шаги

1. ✅ Создать тестовый PR с заменой одной функции
2. Протестировать результаты поиска
3. Применить ко всем функциям
4. Удалить старый код
