# Рекомендуемые индексы БД для оптимизации

## 📌 Критичные (FULLTEXT для поиска)

```sql
-- Ускорение поиска по сканлейтерам
ALTER TABLE cdb_comics ADD FULLTEXT INDEX ft_translate (translate);
ALTER TABLE cdb_comics ADD FULLTEXT INDEX ft_edit (edit);

-- Ускорение поиска по персонажам/авторам/командам
ALTER TABLE cdb_comics ADD FULLTEXT INDEX ft_characters (characters);
ALTER TABLE cdb_comics ADD FULLTEXT INDEX ft_creators (creators);
ALTER TABLE cdb_comics ADD FULLTEXT INDEX ft_teams (teams);
```

**Эффект:** 10-50x ускорение поиска (от полного сканирования таблицы к индексному поиску)

## 📌 Важные (обычные индексы)

```sql
-- Для JOIN операций
CREATE INDEX idx_series_publisher ON cdb_series(publisher);
CREATE INDEX idx_comics_serie ON cdb_comics(serie);

-- Для фильтрации по date_delete
CREATE INDEX idx_series_date_delete ON cdb_series(date_delete);
CREATE INDEX idx_comics_date_delete ON cdb_comics(date_delete);
CREATE INDEX idx_publishers_date_delete ON cdb_publishers(date_delete);

-- Для сортировки
CREATE INDEX idx_comics_dates ON cdb_comics(date, pdate, adddate);
```

## 📌 Проверка существующих индексов

```sql
SHOW INDEX FROM cdb_series;
SHOW INDEX FROM cdb_comics;
SHOW INDEX FROM cdb_publishers;
```

## 📌 Использование после добавления индексов

В `lib/search-helpers.ts` заменить LIKE на MATCH AGAINST:

```typescript
// Вместо LIKE (текущая реализация)
export function createCsvSearchCondition(field: string, query: string): Prisma.Sql {
  return Prisma.sql`MATCH(${Prisma.raw(field)}) AGAINST(${query} IN BOOLEAN MODE)`
}
```

**Файл:** [lib/search-helpers.ts](../lib/search-helpers.ts:29-41)
