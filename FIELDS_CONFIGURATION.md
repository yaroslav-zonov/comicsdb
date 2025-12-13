# Конфигурация полей для карточек и таблиц

Этот документ описывает, какие поля отображаются в карточках и таблицах на каждой странице проекта. Используйте его как справочник для настройки отображения данных.

---

## 1. КОМПОНЕНТ: ComicCard (Карточка комикса)

### Доступные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `showCover` | boolean | Показывать обложку (по умолчанию: `true`) |
| `showTitle` | boolean | Показывать название (по умолчанию: `true`) |
| `titleMode` | `'number-only'` \| `'full'` | Режим отображения названия: только номер или полное название (по умолчанию: `'full'`) |
| `showPublisher` | boolean | Показывать издательство (по умолчанию: `false`) |
| `showSite` | boolean | Показывать сайт переводчика (по умолчанию: `false`) |
| `showDate` | boolean | Показывать дату (по умолчанию: `false`) |
| `coverAspectRatio` | `'2/3'` \| `'auto'` | Соотношение сторон обложки (по умолчанию: `'2/3'`) |

### Данные в ComicCardData

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `id` | number | ✅ | ID перевода |
| `comicvine` | number | ✅ | Comicvine ID (постоянный идентификатор) |
| `number` | number | ✅ | Номер выпуска |
| `series.id` | number | ✅ | ID серии |
| `series.name` | string | ✅ | Название серии |
| `series.publisher.id` | number | ✅ | ID издательства |
| `series.publisher.name` | string | ✅ | Название издательства |
| `thumb` | string \| null | ❌ | URL обложки (thumb) |
| `tiny` | string \| null | ❌ | URL обложки (tiny) |
| `siteName` | string \| null | ❌ | Название сайта переводчика |
| `site2Name` | string \| null | ❌ | Название второго сайта (для совместных релизов) |
| `date` | Date \| null | ❌ | Дата перевода |
| `pdate` | Date \| null | ❌ | Дата публикации |

---

## 2. КОМПОНЕНТ: TableRow (Строка таблицы)

### Варианты отображения (variant)

#### `variant: 'main'` - Главная страница
**Порядок колонок:**
1. Обложка
2. Название + Издательство (группированы)
3. Сайт-переводчик (кликабельный, если есть `siteId`; показывает обе команды через запятую для совместных релизов)
4. Дата публикации перевода (`date`)
5. Кнопка скачать (иконка `ArrowDownTrayIcon`)

**Требуемые поля:**
- `id`, `comicvine`, `number`
- `series.id`, `series.name`, `series.publisher.id`, `series.publisher.name`
- `thumb` или `tiny`
- `siteName`, `siteId` (опционально)
- `site2Name`, `site2Id` (опционально, для совместных релизов)
- `date`
- `link` (для кнопки скачать)

---

#### `variant: 'comic-page'` - Страница комикса (таблица переводов)
**Порядок колонок:**
1. Сайт-переводчик (кликабельный, если есть `siteId`; показывает обе команды через запятую для совместных релизов)
2. Переводчик(и) (каждый через запятую - отдельная ссылка)
3. Оформитель(и) (каждый через запятую - отдельная ссылка)
4. Дата публикации перевода (`date`)
5. Кнопка скачать (иконка `ArrowDownTrayIcon`)

**Требуемые поля:**
- `id`, `comicvine`, `number`
- `series.id`, `series.name`, `series.publisher.id`, `series.publisher.name`
- `siteName`, `siteId` (опционально)
- `site2Name`, `site2Id` (опционально, для совместных релизов)
- `translate` (строка с именами через запятую)
- `edit` (строка с именами через запятую)
- `date`
- `link` (для кнопки скачать)
- `isJoint` (boolean, для определения совместного релиза)

---

#### `variant: 'series'` - Страница серии
**Порядок колонок:**
1. Обложка
2. Сайт-переводчик (кликабельный, если есть `siteId`; показывает обе команды через запятую для совместных релизов)
3. Переводчик(и) (каждый через запятую - отдельная ссылка)
4. Оформитель(и) (каждый через запятую - отдельная ссылка)
5. Дата публикации перевода (`date`)
6. Кнопка скачать (иконка `ArrowDownTrayIcon` или `XMarkIcon`)

**Требуемые поля:**
- `id`, `comicvine`, `number`
- `series.id`, `series.name`, `series.publisher.id`, `series.publisher.name`
- `thumb` или `tiny`
- `siteName`, `siteId` (опционально)
- `site2Name`, `site2Id` (опционально, для совместных релизов)
- `translate` (строка с именами через запятую)
- `edit` (строка с именами через запятую)
- `date`
- `link` (для кнопки скачать)

---

#### `variant: 'character-creator-team'` - Поиск по персонажам/авторам/командам
**Порядок колонок:**
1. Обложка
2. Название выпуска + Издательство (группированы) + Маркер глобального события (★, если `hasGlobalEvent`)
3. Сайт-переводчик (кликабельный, если есть `siteId`)
4. Дата перевода (`date`)
5. Дата публикации (`pdate`)
6. Кнопка скачать (иконка `ArrowDownTrayIcon`)

**Требуемые поля:**
- `id`, `comicvine`, `number`
- `series.id`, `series.name`, `series.publisher.id`, `series.publisher.name`
- `thumb` или `tiny`
- `date` или `pdate` (для даты перевода)
- `pdate` (для даты публикации)
- `siteName`, `siteId` (опционально)
- `link` (для кнопки скачать)
- `hasGlobalEvent` (boolean, опционально)

---

#### `variant: 'scanlator'` - Поиск по сканлейтерам
**Порядок колонок:**
1. Обложка
2. Название выпуска + Издательство (группированы: название на первой строке, издательство на второй) + Маркер глобального события (★, если `hasGlobalEvent`)
3. Сайт-переводчик + Роли искомого сканлейтера (группированы: сайт на первой строке, роли на второй строке под сайтом; кликабельный, если есть `siteId`; показывает обе команды через запятую для совместных релизов)
4. Дата перевода (`date`)
5. Дата публикации (`pdate`)
6. Кнопка скачать (иконка `ArrowDownTrayIcon`)

**Требуемые поля:**
- `id`, `comicvine`, `number`
- `series.id`, `series.name`, `series.publisher.id`, `series.publisher.name`
- `thumb` или `tiny`
- `date` (для даты перевода)
- `pdate` (для даты публикации)
- `siteName`, `siteId` (опционально)
- `site2Name`, `site2Id` (опционально, для совместных релизов)
- `translate` (строка с именами через запятую)
- `edit` (строка с именами через запятую)
- `link` (для кнопки скачать)
- `hasGlobalEvent` (boolean, опционально)
- `scanlatorQuery` (string, опционально) - имя искомого сканлейтера для фильтрации ролей

---

#### `type: 'series'`, `variant: 'search'` - Поиск по сериям (таблица)
**Порядок колонок:**
1. Обложка (из первого выпуска или `thumb` серии)
2. Название серии + Том (если есть) + Издательство (группированы)
3. Статус перевода (Завершён / Продолжается)
4. Количество переведённых выпусков / Общее количество (X / Y)

**Требуемые поля:**
- `id`
- `name`
- `publisher.id`, `publisher.name`
- `thumb` (обложка)
- `status` (опционально)
- `comicsCount` (количество переведённых выпусков)
- `total` или `comicvine` (общее количество выпусков)

---

## 3. КОМПОНЕНТ: ComicsListView (Список комиксов с переключением вида)

### Параметры компонента

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `title` | string \| undefined | - | Заголовок блока |
| `showCover` | boolean | `true` | Показывать обложку в карточках |
| `showTitle` | boolean | `true` | Показывать название в карточках |
| `titleMode` | `'number-only'` \| `'full'` | `'full'` | Режим отображения названия |
| `showPublisher` | boolean | `false` | Показывать издательство в карточках |
| `showSite` | boolean | `false` | Показывать сайт переводчика в карточках |
| `showDate` | boolean | `false` | Показывать дату в карточках |
| `tableVariant` | `'main'` \| `'comic-page'` \| `'character-creator-team'` \| `'scanlator'` \| `'series'` | `'main'` | Вариант таблицы |
| `showTableOnMobile` | boolean | `false` | Показывать таблицу на мобильных устройствах |
| `groupByNumber` | boolean | `false` | Группировать комиксы по номеру (для карточек) |
| `additionalTableData` | Array\<...\> \| undefined | - | Дополнительные данные для таблицы |

### Структура additionalTableData

```typescript
Array<{
  id: number
  siteName?: string | null
  siteId?: string | null
  site2Name?: string | null
  site2Id?: string | null
  date?: Date | null
  link?: string | null
  translate?: string | null
  edit?: string | null
  pdate?: Date | null
  isJoint?: boolean
}>
```

---

## 4. КОМПОНЕНТ: SeriesListView (Список серий с переключением вида)

### Параметры компонента

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `title` | string \| undefined | - | Заголовок блока |

### Данные в SeriesData

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `id` | number | ✅ | ID серии |
| `name` | string | ✅ | Название серии |
| `volume` | string | ✅ | Том серии |
| `publisher.id` | number | ✅ | ID издательства |
| `publisher.name` | string | ✅ | Название издательства |
| `thumb` | string \| null | ❌ | URL обложки |
| `status` | string | ❌ | Статус серии |
| `comicvine` | number | ❌ | Количество всех выпусков |
| `comicsCount` | number | ✅ | Количество переведённых выпусков |
| `total` | number | ❌ | Общее количество выпусков |

---

## 5. КОНФИГУРАЦИЯ ПО СТРАНИЦАМ

### 5.1 Главная страница (`/`)

#### Блок "Новые серии" (NewSeries)
**Компонент:** `ComicCard` (напрямую)

**Конфигурация:**
```typescript
{
  showCover: true,
  showTitle: true,
  titleMode: 'full',
  showPublisher: false,
  showSite: true,
  showDate: false
}
```

**Данные:**
- Обложка (`thumb` или `tiny`)
- Название серии + номер выпуска
- Сайт переводчика (`siteName`)

---

#### Блок "Свежие релизы" (FreshReleases)
**Компонент:** `ComicsListView`

**Конфигурация:**
```typescript
{
  title: "Свежие релизы",
  showCover: true,
  showTitle: true,
  titleMode: 'full',
  showPublisher: false,
  showSite: true,
  showDate: false,
  tableVariant: 'main',
  showTableOnMobile: false,
  groupByNumber: false
}
```

**Карточки:**
- Обложка
- Название серии + номер выпуска
- Сайт переводчика (`siteName`, `site2Name` для совместных релизов)

**Таблица (variant: 'main'):**
- Обложка
- Название + Издательство
- Сайт-переводчик (обе команды через запятую для совместных релизов)
- Дата публикации
- Кнопка скачать

---

### 5.2 Страница издательства (`/publishers/[publisherId]`)

**Компонент:** `SeriesListView`

**Конфигурация:**
- Карточки: обложка, название серии (только обложка и название)
- Таблица: обложка, название серии + том, издательство, статус перевода, количество переведённых / общее

---

### 5.3 Страница серии (`/publishers/[publisherId]/[seriesId]`)

**Компонент:** `SeriesComicsView` → `ComicsListView`

**Конфигурация:**
```typescript
{
  title: "Выпуски",
  showCover: true,
  showTitle: true,
  titleMode: 'number-only',  // Только номер выпуска
  showPublisher: false,
  showSite: false,
  showDate: false,
  tableVariant: 'series',
  showTableOnMobile: false,
  groupByNumber: true  // В карточках показываем уникальные выпуски
}
```

**Карточки:**
- Обложка
- Только номер выпуска (`#123`)

**Таблица (variant: 'series'):**
- Обложка
- Сайт-переводчик (обе команды через запятую для совместных релизов)
- Переводчик(и) (каждый через запятую - отдельная ссылка)
- Оформитель(и) (каждый через запятую - отдельная ссылка)
- Дата публикации
- Кнопка скачать

---

### 5.4 Страница комикса (`/publishers/[publisherId]/[seriesId]/[comicId]`)

**Компонент:** `TableRow` (напрямую, только таблица)

**Конфигурация:**
```typescript
{
  type: 'comic',
  variant: 'comic-page'
}
```

**Таблица (variant: 'comic-page'):**
- Сайт-переводчик (обе команды через запятую для совместных релизов)
- Переводчик(и) (каждый через запятую - отдельная ссылка)
- Оформитель(и) (каждый через запятую - отдельная ссылка)
- Дата публикации
- Кнопка скачать

---

### 5.5 Страница поиска (`/search`)

#### Таб "По сериям"
**Компонент:** `SearchResultsView` → `SeriesListView` (карточки) или `TableRow` (таблица)

**Карточки:**
- Обложка
- Название серии
- Издательство
- Количество выпусков

**Таблица (type: 'series', variant: 'search'):**
- Обложка
- Название серии + Том + Издательство
- Статус перевода
- Количество переведённых / общее

---

#### Таб "Персонажам" / "Авторам" / "Командам"
**Компонент:** `SearchResultsView` → `ComicCard` (карточки) или `TableRow` (таблица)

**Конфигурация карточек:**
```typescript
{
  showCover: true,
  showTitle: true,
  titleMode: 'full',
  showPublisher: true,  // Показываем издательство
  showSite: true,
  showDate: false
}
```

**Конфигурация таблицы:**
```typescript
{
  type: 'comic',
  variant: 'character-creator-team'
}
```

**Таблица (variant: 'character-creator-team'):**
- Обложка
- Название выпуска + Издательство + Маркер глобального события (★)
- Дата перевода
- Дата публикации
- Сайт-переводчик
- Кнопка скачать

---

#### Таб "Сканлейтерам"
**Компонент:** `SearchResultsView` → `ComicCard` (карточки) или `TableRow` (таблица)

**Конфигурация карточек:**
```typescript
{
  showCover: true,
  showTitle: true,
  titleMode: 'full',
  showPublisher: false,  // Не показываем издательство
  showSite: true,
  showDate: false
}
```

**Конфигурация таблицы:**
```typescript
{
  type: 'comic',
  variant: 'scanlator',
  scanlatorQuery: query  // Имя искомого сканлейтера для фильтрации ролей
}
```

**Таблица (variant: 'scanlator'):**
- Обложка
- Название выпуска + Издательство (группированы: название на первой строке, издательство на второй) + Маркер глобального события (★)
- Сайт-переводчик + Роли искомого сканлейтера (группированы: сайт на первой строке, роли на второй строке под сайтом; обе команды через запятую для совместных релизов)
- Дата перевода (`date`)
- Дата публикации (`pdate`)
- Кнопка скачать

**Примечание:** В таблице отображаются только роли искомого сканлейтера (Переводчик, Оформитель или оба), имена других сканлейтеров не показываются. Название и издательство сгруппированы вертикально (как на главной странице), сайт и роли также сгруппированы вертикально (роли под сайтом).

---

## 6. СПЕЦИАЛЬНЫЕ СЛУЧАИ

### 6.1 Совместные релизы

**Определение:**
- Если в записи есть `site2` (и `site2 !== '0'`), это совместный релиз
- Отображаются обе команды через запятую: `"Команда1, Команда2"`
- Обе команды кликабельны (если есть `siteId` и `site2Id`)

**Где применяется:**
- В карточках (`ComicCard`): поле `showSite` показывает обе команды
- В таблицах: все варианты, где отображается сайт-переводчик

---

### 6.2 Переводчик(и) и Оформитель(и)

**Формат данных:**
- Строка с именами через запятую: `"Имя1, Имя2, Имя3"`
- Каждое имя - отдельная кликабельная ссылка
- Роли в скобках (например, `"Имя (роль)")` не кликабельны

**Где применяется:**
- Таблица на странице комикса (`variant: 'comic-page'`)
- Таблица на странице серии (`variant: 'series'`)
- Таблица поиска по сканлейтерам (`variant: 'scanlator'`)

---

### 6.3 Глобальные события

**Маркер:** ★ (звёздочка) рядом с названием выпуска

**Где применяется:**
- Таблица поиска по персонажам/авторам/командам (`variant: 'character-creator-team'`)
- Таблица поиска по сканлейтерам (`variant: 'scanlator'`)

**Требуемое поле:** `hasGlobalEvent: boolean`

---

## 7. ПРИМЕРЫ КОНФИГУРАЦИИ

### Пример 1: Главная страница - Свежие релизы

```typescript
<ComicsListView
  comics={comicsData}
  title="Свежие релизы"
  showCover={true}
  showTitle={true}
  titleMode="full"
  showPublisher={false}
  showSite={true}
  showDate={false}
  tableVariant="main"
  showTableOnMobile={false}
  groupByNumber={false}
  additionalTableData={comics.map(comic => ({
    id: comic.id,
    siteName: comic.siteName,
    siteId: comic.siteId,
    site2Name: comic.site2Name,
    site2Id: comic.site2Id,
    link: comic.link,
    pdate: comic.pdate,
    isJoint: comic.isJoint,
  }))}
/>
```

### Пример 2: Страница серии - Выпуски

```typescript
<ComicsListView
  comics={comicsData}
  title="Выпуски"
  showCover={true}
  showTitle={true}
  titleMode="number-only"  // Только номер
  showPublisher={false}
  showSite={false}
  showDate={false}
  tableVariant="series"
  showTableOnMobile={false}
  groupByNumber={true}  // Группировка для карточек
  additionalTableData={comics.map(comic => ({
    id: comic.id,
    siteName: comic.siteName,
    siteId: comic.siteId,
    site2Name: comic.site2Name,
    site2Id: comic.site2Id,
    translate: comic.translate,
    edit: comic.edit,
    pdate: comic.pdate,
    link: comic.link,
  }))}
/>
```

### Пример 3: Поиск - Таб "Сканлейтерам"

```typescript
// Карточки
<ComicCard
  data={comic}
  showCover={true}
  showTitle={true}
  titleMode="full"
  showPublisher={false}  // Не показываем издательство
  showSite={true}
  showDate={false}
/>

// Таблица
<TableRow
  type="comic"
  variant="scanlator"
  data={{
    id: comic.id,
    comicvine: comic.comicvine,
    number: comic.number,
    series: comic.series,
    thumb: comic.thumb,
    tiny: comic.tiny,
    siteName: comic.siteName,
    siteId: comic.siteId,
    site2Name: comic.site2Name,
    site2Id: comic.site2Id,
    translate: comic.translate,
    edit: comic.edit,
    date: comic.date,
    pdate: comic.pdate,
    link: comic.link,
    hasGlobalEvent: comic.hasGlobalEvent,
  }}
  scanlatorQuery={query}  // Имя искомого сканлейтера
/>
```

---

## 8. ЧЕКЛИСТ ДЛЯ НАСТРОЙКИ

При добавлении нового места отображения комиксов/серий:

- [ ] Определить, нужны ли карточки или таблица (или оба варианта)
- [ ] Выбрать подходящий `variant` для таблицы
- [ ] Настроить `titleMode` для карточек (`'number-only'` или `'full'`)
- [ ] Определить, какие поля показывать в карточках (`showPublisher`, `showSite`, `showDate`)
- [ ] Если используется таблица, подготовить `additionalTableData` с нужными полями
- [ ] Убедиться, что переданы все обязательные поля для выбранного `variant`
- [ ] Проверить поддержку совместных релизов (`site2Name`, `site2Id`, `isJoint`)
- [ ] Если нужны переводчики/оформители, убедиться что переданы `translate` и `edit`
- [ ] Если нужны глобальные события, передать `hasGlobalEvent`

---

**Последнее обновление:** Декабрь 2024

