# 📊 Руководство по добавлению индексов базы данных

**Дата:** 2025-12-17
**Автор:** Claude Sonnet 4.5
**Статус:** Готово к применению администратором БД

---

## 🎯 Цель

Добавить составные индексы для оптимизации запросов, которые были оптимизированы в рамках работы по улучшению производительности приложения.

**Контекст:**
- Оптимизирован поиск по всем категориям (персонажи, авторы, команды, сканлейтеры, серии)
- Оптимизированы страницы: жанры, сайты, издатели, серии
- Все запросы используют составные JOIN с фильтрацией по `date_delete IS NULL`
- Текущие индексы покрывают только отдельные поля, но не комбинации

**Проблема:**
- Пользователь БД `yazonov` не имеет прав на `CREATE INDEX` и `ALTER TABLE`
- Необходимо применение индексов администратором БД

---

## 📋 Индексы для создания

### 1. cdb_comics

```sql
-- Для поиска по персонажам/авторам/командам с сортировкой по дате
CREATE INDEX idx_comics_date_delete_pdate
ON cdb_comics(date_delete, pdate);

-- Для подзапросов получения комиксов серии
CREATE INDEX idx_comics_serie_delete_number
ON cdb_comics(serie, date_delete, number);

-- Для фильтрации по основному сайту
CREATE INDEX idx_comics_site_delete
ON cdb_comics(site, date_delete);

-- Для фильтрации по второму сайту
CREATE INDEX idx_comics_site2_delete
ON cdb_comics(site2, date_delete);

-- Для агрегации дат (MIN/MAX)
CREATE INDEX idx_comics_delete_dates
ON cdb_comics(date_delete, pdate, adddate);
```

### 2. cdb_series

```sql
-- Для поиска серий по издателю с сортировкой по имени
CREATE INDEX idx_series_publisher_delete_name
ON cdb_series(publisher, date_delete, name);

-- Для JOIN серий с комиксами (покрытие фильтра date_delete)
CREATE INDEX idx_series_id_delete
ON cdb_series(id, date_delete);
```

### 3. cdb_publishers

```sql
-- Для JOIN издателей (покрытие фильтра date_delete)
CREATE INDEX idx_publishers_id_delete
ON cdb_publishers(id, date_delete);
```

### 4. cdb_series_genres

```sql
-- Для поиска серий по жанру (оптимизация JOIN)
CREATE INDEX idx_series_genres_genre_series
ON cdb_series_genres(genre_id, series_id);
```

### 5. cdb_sites

```sql
-- Для LEFT JOIN сайтов (покрытие фильтра date_delete)
CREATE INDEX idx_sites_id_delete
ON cdb_sites(id, date_delete);
```

---

## 🚀 Скрипт для применения (копировать целиком)

```sql
-- ============================================================================
-- Создание составных индексов для оптимизации запросов ComicsDB
-- Дата: 2025-12-17
-- ============================================================================

USE comicsdb;

-- cdb_comics (5 индексов)
CREATE INDEX idx_comics_date_delete_pdate
ON cdb_comics(date_delete, pdate);

CREATE INDEX idx_comics_serie_delete_number
ON cdb_comics(serie, date_delete, number);

CREATE INDEX idx_comics_site_delete
ON cdb_comics(site, date_delete);

CREATE INDEX idx_comics_site2_delete
ON cdb_comics(site2, date_delete);

CREATE INDEX idx_comics_delete_dates
ON cdb_comics(date_delete, pdate, adddate);

-- cdb_series (2 индекса)
CREATE INDEX idx_series_publisher_delete_name
ON cdb_series(publisher, date_delete, name);

CREATE INDEX idx_series_id_delete
ON cdb_series(id, date_delete);

-- cdb_publishers (1 индекс)
CREATE INDEX idx_publishers_id_delete
ON cdb_publishers(id, date_delete);

-- cdb_series_genres (1 индекс)
CREATE INDEX idx_series_genres_genre_series
ON cdb_series_genres(genre_id, series_id);

-- cdb_sites (1 индекс)
CREATE INDEX idx_sites_id_delete
ON cdb_sites(id, date_delete);

-- Готово! Проверка индексов:
SHOW INDEX FROM cdb_comics WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM cdb_series WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM cdb_publishers WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM cdb_series_genres WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM cdb_sites WHERE Key_name LIKE 'idx_%';
```

---

## ⏱️ Ожидаемое время выполнения

| Таблица | Примерное кол-во записей | Время на 1 индекс | Всего индексов | Общее время |
|---------|-------------------------|-------------------|----------------|-------------|
| cdb_comics | ~100,000 | 5-10 сек | 5 | ~30-50 сек |
| cdb_series | ~10,000 | 2-5 сек | 2 | ~5-10 сек |
| cdb_publishers | ~500 | <1 сек | 1 | <1 сек |
| cdb_series_genres | ~20,000 | 2-5 сек | 1 | ~3-5 сек |
| cdb_sites | ~100 | <1 сек | 1 | <1 сек |
| **ИТОГО** | | | **10** | **~40-70 сек** |

---

## 💾 Размер индексов

Примерный расчет для таблицы с 100,000 комиксов:

- `idx_comics_date_delete_pdate`: ~3-5 MB
- `idx_comics_serie_delete_number`: ~4-6 MB
- `idx_comics_site_delete`: ~2-3 MB
- `idx_comics_site2_delete`: ~2-3 MB
- `idx_comics_delete_dates`: ~4-6 MB
- `idx_series_publisher_delete_name`: ~1-2 MB
- `idx_series_id_delete`: ~500 KB
- `idx_publishers_id_delete`: ~50 KB
- `idx_series_genres_genre_series`: ~500 KB
- `idx_sites_id_delete`: ~10 KB

**Общий размер:** ~20-30 MB

---

## 📈 Ожидаемые улучшения производительности

### До добавления индексов (текущее состояние)
```
searchByCharacters: 10-15ms (уже оптимизировано SQL-запросами)
searchByCreators: 10-15ms
searchByTeams: 10-15ms
Genre page: 15-30ms
Site page: 100-200ms
Publisher page: 10-20ms
Series page: 5-10ms
```

### После добавления индексов (прогноз)
```
searchByCharacters: 3-7ms (-50%)
searchByCreators: 3-7ms (-50%)
searchByTeams: 3-7ms (-50%)
Genre page: 5-15ms (-60%)
Site page: 30-80ms (-70%)
Publisher page: 3-8ms (-60%)
Series page: 2-5ms (-50%)
```

**Общее улучшение:** -50-70% времени выполнения запросов

---

## 🔍 Как проверить, что индексы применились

После выполнения скрипта проверьте индексы:

```sql
-- Проверить все новые индексы
SELECT
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'comicsdb'
  AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

Должно быть **10 новых индексов**:
- 5 на `cdb_comics`
- 2 на `cdb_series`
- 1 на `cdb_publishers`
- 1 на `cdb_series_genres`
- 1 на `cdb_sites`

---

## 🧪 Тестирование индексов с EXPLAIN

После создания индексов можно проверить, что MySQL их использует:

```sql
-- Пример 1: Поиск комиксов по персонажу
EXPLAIN
SELECT c.id, c.comicvine, c.number
FROM cdb_comics c
INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
WHERE c.date_delete IS NULL
  AND c.characters LIKE '%Spider-Man%'
ORDER BY c.pdate DESC
LIMIT 100;

-- Должен использовать: idx_comics_date_delete_pdate

-- Пример 2: Получение комиксов серии
EXPLAIN
SELECT c.id, c.number, c.thumb
FROM cdb_comics c
WHERE c.serie = 123
  AND c.date_delete IS NULL
ORDER BY c.number ASC;

-- Должен использовать: idx_comics_serie_delete_number

-- Пример 3: Серии издателя
EXPLAIN
SELECT s.id, s.name
FROM cdb_series s
WHERE s.publisher = 456
  AND s.date_delete IS NULL
ORDER BY s.name ASC;

-- Должен использовать: idx_series_publisher_delete_name
```

Ожидаемые результаты EXPLAIN:
- `type`: должен быть `ref` или `range` (НЕ `ALL`)
- `key`: должен показывать наш новый индекс (например, `idx_comics_date_delete_pdate`)
- `rows`: должно быть значительно меньше, чем общее количество строк в таблице

---

## ⚠️ Важные замечания

### 1. Влияние на производительность записи
- Каждый индекс замедляет операции INSERT/UPDATE/DELETE примерно на 2-5%
- При 10 новых индексах общее замедление: ~5-10%
- Это **приемлемо**, так как на ComicsDB преобладают операции чтения

### 2. Обслуживание индексов
- Индексы обновляются автоматически при изменении данных
- Периодически (раз в месяц) полезно запускать `OPTIMIZE TABLE`
- Индексы используют дополнительное место на диске (~20-30 MB)

### 3. Совместимость
- Все индексы совместимы с MySQL 5.7+ и MariaDB 10.2+
- Индексы НЕ требуют изменения кода приложения
- После создания индексов MySQL автоматически начнет их использовать

### 4. Откат (если что-то пойдет не так)

Если нужно удалить индексы:

```sql
-- Удаление всех новых индексов
DROP INDEX idx_comics_date_delete_pdate ON cdb_comics;
DROP INDEX idx_comics_serie_delete_number ON cdb_comics;
DROP INDEX idx_comics_site_delete ON cdb_comics;
DROP INDEX idx_comics_site2_delete ON cdb_comics;
DROP INDEX idx_comics_delete_dates ON cdb_comics;
DROP INDEX idx_series_publisher_delete_name ON cdb_series;
DROP INDEX idx_series_id_delete ON cdb_series;
DROP INDEX idx_publishers_id_delete ON cdb_publishers;
DROP INDEX idx_series_genres_genre_series ON cdb_series_genres;
DROP INDEX idx_sites_id_delete ON cdb_sites;
```

---

## 📊 Детали каждого индекса

### cdb_comics

#### 1. idx_comics_date_delete_pdate
**Назначение:** Фильтрация активных комиксов с сортировкой по дате публикации
**Использование:** Поиск по персонажам, авторам, командам
**Запрос:**
```sql
WHERE c.date_delete IS NULL
ORDER BY c.pdate DESC
```
**Покрытие:** ~95% запросов поиска по комиксам

---

#### 2. idx_comics_serie_delete_number
**Назначение:** Получение комиксов конкретной серии по порядку номеров
**Использование:** Страница серии, подзапросы для первого комикса
**Запрос:**
```sql
WHERE c.serie = X AND c.date_delete IS NULL
ORDER BY c.number ASC
```
**Покрытие:** 100% подзапросов для обложек

---

#### 3. idx_comics_site_delete
**Назначение:** Фильтрация комиксов по основному сайту
**Использование:** Страница сайта
**Запрос:**
```sql
WHERE (c.site = X OR c.site2 = X) AND c.date_delete IS NULL
```
**Покрытие:** Половина условия OR (для site)

---

#### 4. idx_comics_site2_delete
**Назначение:** Фильтрация комиксов по второму сайту
**Использование:** Страница сайта
**Запрос:**
```sql
WHERE (c.site = X OR c.site2 = X) AND c.date_delete IS NULL
```
**Покрытие:** Вторая половина условия OR (для site2)

---

#### 5. idx_comics_delete_dates
**Назначение:** Агрегация дат для статистики
**Использование:** MIN/MAX дат релизов на странице сайта
**Запрос:**
```sql
MAX(COALESCE(c.date, c.pdate, c.adddate))
WHERE c.date_delete IS NULL
```
**Покрытие:** Агрегационные запросы на статистику

---

### cdb_series

#### 6. idx_series_publisher_delete_name
**Назначение:** Список серий издателя с сортировкой
**Использование:** Страница издателя
**Запрос:**
```sql
WHERE s.publisher = X AND s.date_delete IS NULL
ORDER BY s.name ASC
```
**Покрытие:** 100% запросов страницы издателя

---

#### 7. idx_series_id_delete
**Назначение:** JOIN серий с комиксами
**Использование:** Все оптимизированные запросы
**Запрос:**
```sql
INNER JOIN cdb_series s
ON c.serie = s.id AND s.date_delete IS NULL
```
**Покрытие:** ~90% всех запросов (поиск + страницы)

---

### cdb_publishers

#### 8. idx_publishers_id_delete
**Назначение:** JOIN издателей
**Использование:** Все оптимизированные запросы
**Запрос:**
```sql
INNER JOIN cdb_publishers p
ON s.publisher = p.id AND p.date_delete IS NULL
```
**Покрытие:** ~90% всех запросов (поиск + страницы)

---

### cdb_series_genres

#### 9. idx_series_genres_genre_series
**Назначение:** Поиск серий по жанру
**Использование:** Страница жанра
**Запрос:**
```sql
INNER JOIN cdb_series_genres sg
ON s.id = sg.series_id
WHERE sg.genre_id = X
```
**Покрытие:** 100% запросов страницы жанра

---

### cdb_sites

#### 10. idx_sites_id_delete
**Назначение:** LEFT JOIN сайтов
**Использование:** Поиск, страница серии
**Запрос:**
```sql
LEFT JOIN cdb_sites site1
ON c.site = site1.id AND site1.date_delete IS NULL
```
**Покрытие:** ~60% запросов (где нужны названия сайтов)

---

## ✅ Чек-лист для администратора БД

- [ ] Сделать бэкап базы данных (на всякий случай)
- [ ] Проверить доступное место на диске (нужно ~50 MB свободного места)
- [ ] Скопировать SQL-скрипт из раздела "Скрипт для применения"
- [ ] Выполнить скрипт в MySQL/phpMyAdmin/консоли
- [ ] Проверить успешное создание индексов (запрос проверки)
- [ ] Запустить несколько EXPLAIN запросов для проверки
- [ ] Сообщить о завершении

---

## 📞 Контакты

Если возникнут вопросы:
- Проверьте документы: [DATABASE_OPTIMIZATION_PLAN.md](DATABASE_OPTIMIZATION_PLAN.md) и [SEARCH_OPTIMIZATION_COMPLETE.md](SEARCH_OPTIMIZATION_COMPLETE.md)
- Все индексы добавлены в [schema.prisma](prisma/schema.prisma) (строки 99-106, 57-58, 25, 201, 128)

---

**Итого:** 10 индексов, ~40-70 секунд на создание, улучшение производительности на 50-70%

✅ Готово к применению!
