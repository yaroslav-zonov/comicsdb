# План рефакторинга UI/UX

## ✅ Выполнено

### 1. Исправлены критические баги
- ✅ Исправлены 5 синтаксических ошибок `dark::hover:` → `dark:hover:` в SearchResultsView.tsx
- ✅ Созданы глобальные утилитарные классы в globals.css
- ✅ Применены новые классы в app/publishers/page.tsx

### 2. Создана система дизайна

**Файл:** [app/globals.css](app/globals.css:101-170)

Добавлены глобальные утилиты:
- `.list-item` - консистентный стиль для элементов списка
- `.list-divider` - разделители списков
- `.section-spacing` - стандартный отступ для секций (py-12)
- `.section-spacing-sm` - малый отступ (py-8)
- `.grid-standard` - стандартный gap-4
- `.grid-cards` - responsive grid для карточек
- `.btn`, `.btn-primary`, `.btn-secondary` - кнопки
- `.card`, `.card-hover` - карточки
- `.input` - input поля

## 📋 Следующие шаги (осталось выполнить)

### Фаза 1: Замена hardcoded цветов (ВЫСОКИЙ ПРИОРИТЕТ)

#### Файлы для обновления:

**app/sites/page.tsx:**
```diff
- <ul className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
+ <ul className="list-divider">

- className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#111111]"
+ className="block list-item"
```

**app/genres/page.tsx:**
```diff
- <ul className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
+ <ul className="list-divider">

- className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#111111]"
+ className="block list-item"
```

**app/sites/[id]/SiteSeriesView.tsx:**
```diff
- <ul className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
+ <ul className="list-divider">

- className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#111111]"
+ className="list-item"
```

**app/error.tsx:**
```diff
- bg-orange-600 dark:bg-orange-500
+ bg-accent

- hover:bg-orange-700 dark:hover:bg-orange-400
+ hover:bg-accent-hover
```

**app/not-found.tsx:**
```diff
- bg-orange-600 dark:bg-orange-500
+ bg-accent

- hover:bg-orange-700 dark:hover:bg-orange-400
+ hover:bg-accent-hover
```

---

### Фаза 2: Стандартизация spacing

**components/FreshReleases.tsx:**
```diff
- <section className="py-12 bg-bg-primary">
+ <section className="section-spacing bg-bg-primary">
```

**components/NewSeries.tsx:**
```diff
- <section className="py-12 bg-bg-primary">
+ <section className="section-spacing bg-bg-primary">
```

**app/publishers/page.tsx, app/search/page.tsx и др.:**
```diff
- <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
+ <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-spacing-sm">
```

---

### Фаза 3: Стандартизация grid

**components/ComicsListView.tsx:**
```diff
- <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
+ <div className="grid-cards">
```

**components/SeriesListView.tsx:**
```diff
- <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
+ <div className="grid-cards">
```

**components/SearchResultsView.tsx:**
```diff
- <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
+ <div className="grid-cards">
```

**components/NewSeries.tsx:**
Убрать custom calc() для ширины карточек, использовать `.grid-cards`

---

### Фаза 4: Рефакторинг кнопок

**Все кнопки навигации, пагинации, фильтров заменить на:**
- `.btn-primary` для основных действий
- `.btn-secondary` для второстепенных

**components/Pagination.tsx:**
```tsx
// Было:
<button className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover">

// Стало:
<button className="btn-primary">
```

---

### Фаза 5: Рефакторинг карточек

**components/ComicCard.tsx:**
```diff
- <div className="bg-bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
+ <div className="card-hover overflow-hidden">
```

---

### Фаза 6: Рефакторинг форм

**components/Header.tsx (поиск):**
```diff
- <input className="w-full px-4 py-2 bg-bg-input border border-border-primary rounded-lg">
+ <input className="input">
```

**app/search/page.tsx (фильтры):**
Все input и select заменить на `.input`

---

## 🎨 Дополнительные улучшения

### 7. Добавить анимации

Обновить `globals.css`:
```css
@layer utilities {
  /* Плавные анимации появления */
  .fade-in {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Анимация для модального окна */
  .modal-enter {
    animation: modalEnter 0.2s ease-out;
  }

  @keyframes modalEnter {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Hover эффект для карточек */
  .card-lift {
    @apply transition-transform duration-200 hover:-translate-y-1;
  }
}
```

Применить к карточкам:
```diff
- <div className="card-hover overflow-hidden">
+ <div className="card-hover overflow-hidden card-lift">
```

---

### 8. Улучшить loading states

Создать единый компонент `components/ui/Skeleton.tsx`:
```tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-bg-tertiary rounded ${className}`}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
```

Заменить все скелетоны в SearchResultsView.tsx на импорт из `components/ui/Skeleton.tsx`

---

### 9. Responsive improvements

**Улучшить мобильную навигацию в Header.tsx:**

Создать компонент `components/ui/MobileNav.tsx`:
```tsx
const navItems = [
  { href: '/', label: 'Главная' },
  { href: '/publishers', label: 'Издательства' },
  // ...
]

export function MobileNav({ isOpen, onClose }: Props) {
  return (
    <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
      <nav>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className="block list-item">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
```

---

### 10. Создать типы в отдельном файле

**lib/types.ts:**
```typescript
export interface Publisher {
  id: number
  name: string
  seriesCount: number
  comicsCount: number
}

export interface Comic {
  id: number
  comicvine: number
  number: number
  series: {
    id: number
    name: string
    publisher: {
      id: number
      name: string
    }
  }
  thumb: string | null
  tiny: string | null
  siteName: string
  date: Date | null
  pdate: Date
}

// ... остальные типы
```

Импортировать во всех компонентах вместо дублирования типов.

---

## 📊 Метрики улучшения

### До рефакторинга:
- 5 синтаксических ошибок
- 7+ файлов с hardcoded dark mode значениями
- Дублирование стилей в 15+ местах
- Непоследовательные отступы (py-8 vs py-12, gap-3 vs gap-4 vs gap-8)
- Нет системы дизайна

### После рефакторинга:
- ✅ 0 синтаксических ошибок
- ✅ Единая система дизайна (70 строк утилит)
- ✅ Консистентные отступы через классы
- ✅ Переиспользуемые компоненты
- ✅ Улучшенная производительность (меньше CSS)
- ✅ Легкая поддержка (изменение в одном месте)

---

## 🚀 Команды для применения изменений

```bash
# 1. Найти все места с hardcoded цветами
grep -r "dark:divide-\[#2a2a2a\]" app/
grep -r "dark:hover:bg-\[#111111\]" app/
grep -r "bg-orange-600 dark:bg-orange-500" app/

# 2. Заменить в batch
# (выполнить вручную через Edit tool)

# 3. Проверить сборку
npm run build

# 4. Проверить TypeScript
npx tsc --noEmit

# 5. Коммит
git add .
git commit -m "refactor(ui): implement design system and fix hardcoded colors"
```

---

## 📝 Приоритеты выполнения

**Немедленно (критично):**
1. ✅ Исправить `dark::hover:` ошибки
2. ⏳ Заменить hardcoded цвета в 6 файлах (30 мин)

**Высокий приоритет:**
3. ⏳ Применить `.section-spacing` классы (15 мин)
4. ⏳ Применить `.grid-cards` класс (15 мин)

**Средний приоритет:**
5. ⏳ Рефакторинг кнопок с `.btn-*` классами (30 мин)
6. ⏳ Создать `lib/types.ts` с общими типами (20 мин)

**Низкий приоритет (можно позже):**
7. ⏳ Добавить анимации
8. ⏳ Создать `Skeleton.tsx` компонент
9. ⏳ Рефакторинг мобильной навигации

---

**Статус:** В процессе
**Прогресс:** 15% (2 из 9 фаз выполнено)
**Время на завершение:** ~2-3 часа
