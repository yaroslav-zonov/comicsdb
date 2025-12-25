# 🖼️ Система подмены изображений Metron

## Описание

Система позволяет подменять изображения с ComicVine на изображения с Metron для улучшения качества и доступности обложек комиксов.

## Структура

### Файлы

- **`data/metron-images.json`** - JSON файл с соответствиями ComicVine ID → Metron URL
- **`lib/metron-images.ts`** - Утилиты для работы с соответствиями
- **`lib/utils.ts`** - Модифицированная функция `getImageUrl` с поддержкой Metron

## Формат данных

Файл `data/metron-images.json` имеет следующую структуру:

```json
{
  "mappings": {
    "4050-12345": {
      "thumb": "https://metron.cloud/media/image/thumb/12345.jpg",
      "tiny": "https://metron.cloud/media/image/tiny/12345.jpg",
      "small": "https://metron.cloud/media/image/small/12345.jpg",
      "super": "https://metron.cloud/media/image/super/12345.jpg"
    }
  }
}
```

### Ключи

- **Ключ объекта** - ComicVine ID комикса (строка)
- **thumb** - Маленькое изображение (обычно используется в карточках)
- **tiny** - Очень маленькое изображение (fallback)
- **small** - Среднее изображение
- **super** - Большое изображение (для детальных страниц)

## Использование

### Автоматическая подмена

Функция `getImageUrl` автоматически подменяет URL, если передан `comicvineId`:

```typescript
import { getImageUrl } from '@/lib/utils'

// Старый способ (без подмены)
const url = getImageUrl(comic.thumb)

// Новый способ (с подменой на Metron)
const url = getImageUrl(comic.thumb, comic.comicvine, 'thumb')
```

### Ручная подмена

Если нужно явно проверить наличие Metron изображения:

```typescript
import { getMetronImageUrl, hasMetronImage } from '@/lib/metron-images'

// Проверка наличия Metron изображения
if (hasMetronImage(comic.comicvine)) {
  const metronUrl = getMetronImageUrl(comic.comicvine, 'thumb')
  // Использовать metronUrl
}
```

### Получение всех размеров

```typescript
import { getMetronImageSizes } from '@/lib/metron-images'

const sizes = getMetronImageSizes(comic.comicvine)
if (sizes) {
  console.log('thumb:', sizes.thumb)
  console.log('super:', sizes.super)
}
```

## Обновление соответствий

### Добавление нового соответствия

1. Откройте файл `data/metron-images.json`
2. Добавьте новую запись в объект `mappings`:

```json
{
  "mappings": {
    "4050-12345": {
      "thumb": "https://metron.cloud/media/image/thumb/12345.jpg",
      "tiny": "https://metron.cloud/media/image/tiny/12345.jpg",
      "small": "https://metron.cloud/media/image/small/12345.jpg",
      "super": "https://metron.cloud/media/image/super/12345.jpg"
    },
    "4050-67890": {
      "thumb": "https://metron.cloud/media/image/thumb/67890.jpg",
      "tiny": "https://metron.cloud/media/image/tiny/67890.jpg",
      "small": "https://metron.cloud/media/image/small/67890.jpg",
      "super": "https://metron.cloud/media/image/super/67890.jpg"
    }
  }
}
```

3. Сохраните файл
4. Изменения применятся автоматически (кэш обновится при следующем запросе)

### Массовое обновление

Для массового добавления соответствий можно использовать скрипт:

```typescript
// scripts/update-metron-images.ts
import fs from 'fs'
import path from 'path'

const mappings = {
  // Ваши соответствия
}

const data = {
  version: "1.0.0",
  lastUpdated: new Date().toISOString().split('T')[0],
  mappings
}

fs.writeFileSync(
  path.join(process.cwd(), 'data', 'metron-images.json'),
  JSON.stringify(data, null, 2)
)
```

## Где используется

Подмена изображений работает автоматически во всех местах, где используется `getImageUrl` с переданным `comicvineId`:

- ✅ `components/ComicCard.tsx` - карточки комиксов
- ✅ `components/TableRow.tsx` - строки таблиц
- ✅ `app/publishers/[publisherId]/[seriesId]/[comicId]/page.tsx` - страница комикса
- ✅ `app/search/page.tsx` - результаты поиска
- ✅ И другие компоненты, использующие `getImageUrl`

## Производительность

- **Кэширование**: Соответствия загружаются один раз и кэшируются в памяти
- **Быстрый доступ**: O(1) поиск по ComicVine ID
- **Минимальная нагрузка**: JSON файл читается только при первом обращении

## Обратная совместимость

Система полностью обратно совместима:
- Если `comicvineId` не передан, работает как раньше
- Если соответствие Metron не найдено, используется оригинальный ComicVine URL
- Все существующие вызовы `getImageUrl(url)` продолжают работать

## Примеры использования в коде

### Пример 1: Карточка комикса

```typescript
// components/ComicCard.tsx
const comicvineUrl = getImageUrl(data.thumb || data.tiny, data.comicvine, 'thumb')
```

### Пример 2: Страница комикса

```typescript
// app/publishers/[publisherId]/[seriesId]/[comicId]/page.tsx
const thumb = getImageUrl(mainComic.thumb, mainComic.comicvine, 'thumb')
const tiny = getImageUrl(mainComic.tiny, mainComic.comicvine, 'tiny')
const small = getImageUrl(mainComic.small, mainComic.comicvine, 'small')
const superImage = getImageUrl(mainComic.super, mainComic.comicvine, 'super')
```

### Пример 3: Поиск

```typescript
// lib/search-queries.ts
thumb: getImageUrl(comic.thumb, comic.comicvine, 'thumb'),
tiny: getImageUrl(comic.tiny, comic.comicvine, 'tiny'),
```

## Конфигурация Next.js

Домен Metron добавлен в `next.config.js`:

```javascript
images: {
  domains: ['comicvine.gamespot.com', 'metron.cloud'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'metron.cloud',
      pathname: '/**',
    },
  ],
}
```

Это позволяет Next.js Image оптимизировать изображения с Metron.

## Отладка

Для проверки работы системы:

```typescript
import { hasMetronImage, getMetronImageUrl } from '@/lib/metron-images'

const comicvineId = 4050-12345
console.log('Has Metron:', hasMetronImage(comicvineId))
console.log('Metron URL:', getMetronImageUrl(comicvineId, 'thumb'))
```

## Вопросы и поддержка

Если возникнут вопросы:
- Проверьте формат JSON в `data/metron-images.json`
- Убедитесь, что ComicVine ID указан правильно (строка)
- Проверьте, что URL Metron доступны и корректны
- Убедитесь, что домен `metron.cloud` добавлен в `next.config.js`

