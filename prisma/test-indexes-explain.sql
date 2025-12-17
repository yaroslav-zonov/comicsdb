-- ============================================================================
-- EXPLAIN тесты для проверки использования индексов
-- Дата: 2025-12-17
-- Использование: Запустить после создания индексов для проверки
-- ============================================================================

-- ============================================================================
-- 1. ПОИСК ПО ПЕРСОНАЖАМ (idx_comics_date_delete_pdate)
-- ============================================================================
EXPLAIN
SELECT
  c.id, c.comicvine, c.number, c.serie as serie_id,
  c.thumb, c.tiny, c.site, c.site2,
  c.translate, c.edit,
  c.date, c.pdate,
  s.name as series_name,
  p.id as publisher_id, p.name as publisher_name,
  site1.name as site1_name,
  site2.name as site2_name,
  COUNT(*) OVER() as total_count
FROM cdb_comics c
INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
LEFT JOIN cdb_sites site1 ON c.site = site1.id AND site1.date_delete IS NULL
LEFT JOIN cdb_sites site2 ON c.site2 = site2.id AND site2.date_delete IS NULL
WHERE c.date_delete IS NULL
  AND c.characters LIKE '%Spider-Man%'
ORDER BY c.pdate DESC
LIMIT 100;

-- Ожидание:
-- - Индекс: idx_comics_date_delete_pdate или idx_series_id_delete
-- - type: ref или range
-- - НЕ ALL (full table scan)

-- ============================================================================
-- 2. ПОИСК ПО АВТОРАМ (idx_comics_date_delete_pdate)
-- ============================================================================
EXPLAIN
SELECT
  c.id, c.comicvine, c.number, c.serie as serie_id,
  c.thumb, c.tiny, c.site, c.site2,
  c.translate, c.edit,
  c.date, c.pdate,
  s.name as series_name,
  p.id as publisher_id, p.name as publisher_name
FROM cdb_comics c
INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
WHERE c.date_delete IS NULL
  AND c.creators LIKE '%Stan Lee%'
ORDER BY c.pdate DESC
LIMIT 100;

-- Ожидание:
-- - Индекс: idx_comics_date_delete_pdate
-- - Должен ускорить сортировку

-- ============================================================================
-- 3. ПОЛУЧЕНИЕ КОМИКСОВ СЕРИИ (idx_comics_serie_delete_number)
-- ============================================================================
EXPLAIN
SELECT
  c.id, c.comicvine, c.number,
  c.pdate, c.date,
  c.thumb, c.tiny, c.site, c.site2,
  c.translate, c.edit, c.link,
  site1.name as site1_name,
  site2.name as site2_name
FROM cdb_comics c
LEFT JOIN cdb_sites site1 ON c.site = site1.id AND site1.date_delete IS NULL
LEFT JOIN cdb_sites site2 ON c.site2 = site2.id AND site2.date_delete IS NULL
WHERE c.serie = 1
  AND c.date_delete IS NULL
ORDER BY c.number ASC
LIMIT 200;

-- Ожидание:
-- - Индекс: idx_comics_serie_delete_number (ИДЕАЛЬНО)
-- - type: ref
-- - rows: должно быть ~ количество комиксов в серии, НЕ общее количество

-- ============================================================================
-- 4. ПЕРВЫЙ КОМИКС СЕРИИ (idx_comics_serie_delete_number)
-- ============================================================================
EXPLAIN
SELECT c.thumb
FROM cdb_comics c
WHERE c.serie = 1
  AND c.date_delete IS NULL
ORDER BY c.number ASC
LIMIT 1;

-- Ожидание:
-- - Индекс: idx_comics_serie_delete_number (ИДЕАЛЬНО)
-- - type: ref
-- - Extra: Using index condition или Using where

-- ============================================================================
-- 5. КОМИКСЫ САЙТА (idx_comics_site_delete)
-- ============================================================================
EXPLAIN
SELECT
  s.id as series_id,
  s.name as series_name,
  p.id as publisher_id,
  p.name as publisher_name,
  s.thumb as series_thumb,
  MAX(COALESCE(c.date, c.pdate, c.adddate)) as last_date,
  COUNT(c.id) as comics_count
FROM cdb_comics c
INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
WHERE c.date_delete IS NULL
  AND (c.site = 'test' OR c.site2 = 'test')
GROUP BY s.id, s.name, p.id, p.name, s.thumb
ORDER BY last_date DESC;

-- Ожидание:
-- - Индекс: idx_comics_site_delete или idx_comics_site2_delete
-- - type: ref или index_merge
-- - НЕ ALL

-- ============================================================================
-- 6. СТАТИСТИКА САЙТА (idx_comics_delete_dates)
-- ============================================================================
EXPLAIN
SELECT
  COUNT(*) as total_comics,
  MIN(COALESCE(c.date, c.pdate, c.adddate)) as first_release,
  MAX(COALESCE(c.date, c.pdate, c.adddate)) as last_release
FROM cdb_comics c
WHERE c.date_delete IS NULL
  AND (c.site = 'test' OR c.site2 = 'test');

-- Ожидание:
-- - Индекс: idx_comics_delete_dates или idx_comics_site_delete
-- - Должен ускорить MIN/MAX

-- ============================================================================
-- 7. СЕРИИ ИЗДАТЕЛЯ (idx_series_publisher_delete_name)
-- ============================================================================
EXPLAIN
SELECT
  s.id, s.name, s.volume, s.thumb, s.status, s.comicvine, s.total
FROM cdb_series s
WHERE s.publisher = 1
  AND s.date_delete IS NULL
ORDER BY s.name ASC
LIMIT 100;

-- Ожидание:
-- - Индекс: idx_series_publisher_delete_name (ИДЕАЛЬНО)
-- - type: ref
-- - Extra: Using index condition или Using where; Using filesort (допустимо)

-- ============================================================================
-- 8. JOIN СЕРИЙ С КОМИКСАМИ (idx_series_id_delete)
-- ============================================================================
EXPLAIN
SELECT c.id, s.name
FROM cdb_comics c
INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
WHERE c.date_delete IS NULL
LIMIT 100;

-- Ожидание:
-- - Серии: idx_series_id_delete
-- - type: ref
-- - Покрытие JOIN условия

-- ============================================================================
-- 9. JOIN ИЗДАТЕЛЕЙ (idx_publishers_id_delete)
-- ============================================================================
EXPLAIN
SELECT s.id, p.name
FROM cdb_series s
INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
WHERE s.date_delete IS NULL
LIMIT 100;

-- Ожидание:
-- - Издатели: idx_publishers_id_delete
-- - type: eq_ref
-- - Оптимальный JOIN

-- ============================================================================
-- 10. СЕРИИ ПО ЖАНРУ (idx_series_genres_genre_series)
-- ============================================================================
EXPLAIN
SELECT
  s.id, s.name, s.volume, s.thumb,
  p.id as publisher_id, p.name as publisher_name
FROM cdb_series s
INNER JOIN cdb_publishers p ON s.publisher = p.id AND p.date_delete IS NULL
INNER JOIN cdb_series_genres sg ON s.id = sg.series_id
WHERE sg.genre_id = 1
  AND s.date_delete IS NULL
ORDER BY s.name ASC
LIMIT 100;

-- Ожидание:
-- - cdb_series_genres: idx_series_genres_genre_series
-- - type: ref
-- - rows: должно быть близко к реальному количеству серий жанра

-- ============================================================================
-- 11. LEFT JOIN САЙТОВ (idx_sites_id_delete)
-- ============================================================================
EXPLAIN
SELECT c.id, site1.name as site1_name
FROM cdb_comics c
LEFT JOIN cdb_sites site1 ON c.site = site1.id AND site1.date_delete IS NULL
WHERE c.date_delete IS NULL
LIMIT 100;

-- Ожидание:
-- - cdb_sites: idx_sites_id_delete
-- - type: eq_ref или ref
-- - Оптимизированный LEFT JOIN

-- ============================================================================
-- СВОДНАЯ ПРОВЕРКА ВСЕХ ИНДЕКСОВ
-- ============================================================================

-- Проверить, что индексы созданы
SELECT
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
  COUNT(*) as column_count
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME LIKE 'idx_%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- Ожидаемые индексы:
-- cdb_comics.idx_comics_date_delete_pdate (2 колонки)
-- cdb_comics.idx_comics_serie_delete_number (3 колонки)
-- cdb_comics.idx_comics_site_delete (2 колонки)
-- cdb_comics.idx_comics_site2_delete (2 колонки)
-- cdb_comics.idx_comics_delete_dates (3 колонки)
-- cdb_publishers.idx_publishers_id_delete (2 колонки)
-- cdb_series.idx_series_publisher_delete_name (3 колонки)
-- cdb_series.idx_series_id_delete (2 колонки)
-- cdb_series_genres.idx_series_genres_genre_series (2 колонки)
-- cdb_sites.idx_sites_id_delete (2 колонки)

-- ============================================================================
-- АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================================================

-- Включить профилирование
SET profiling = 1;

-- Запустить тестовый запрос (пример: поиск по персонажам)
SELECT COUNT(*)
FROM cdb_comics c
INNER JOIN cdb_series s ON c.serie = s.id AND s.date_delete IS NULL
WHERE c.date_delete IS NULL
  AND c.characters LIKE '%Spider-Man%';

-- Посмотреть время выполнения
SHOW PROFILES;

-- Детальная информация о последнем запросе
SHOW PROFILE FOR QUERY 1;

-- ============================================================================
-- КАК ИНТЕРПРЕТИРОВАТЬ РЕЗУЛЬТАТЫ EXPLAIN
-- ============================================================================

/*
Важные поля в EXPLAIN:

1. type (от лучшего к худшему):
   - const: лучший, константа
   - eq_ref: уникальный индекс для каждой строки
   - ref: индекс для нескольких строк (ХОРОШО)
   - range: диапазон значений (ХОРОШО)
   - index: полное сканирование индекса (СРЕДНЕ)
   - ALL: полное сканирование таблицы (ПЛОХО)

2. key:
   - Должно показывать наш индекс (idx_*)
   - NULL = индекс не используется (ПЛОХО)

3. rows:
   - Количество строк для сканирования
   - Меньше = лучше
   - Должно быть близко к реальному результату

4. Extra:
   - "Using index" = covering index (ОТЛИЧНО)
   - "Using where" = фильтрация после индекса (НОРМАЛЬНО)
   - "Using filesort" = сортировка в памяти (допустимо для ORDER BY)
   - "Using temporary" = временная таблица (СРЕДНЕ)
*/

-- ============================================================================
-- ИТОГОВАЯ ПРОВЕРКА: ВСЕ 10 ИНДЕКСОВ ДОЛЖНЫ ПРИСУТСТВОВАТЬ
-- ============================================================================

SELECT
  COUNT(DISTINCT INDEX_NAME) as total_new_indexes
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME LIKE 'idx_%';

-- Ожидаемый результат: 10
