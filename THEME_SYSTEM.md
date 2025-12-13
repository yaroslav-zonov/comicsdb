# Система токенов для тем оформления

## Обзор

Проект использует систему CSS-переменных (токенов) для управления цветами в светлой и тёмной темах. Все цвета определены в `app/globals.css` и доступны через Tailwind CSS классы.

## Структура токенов

### Фоны
- `bg-bg-primary` - Основной фон страницы
- `bg-bg-secondary` - Вторичный фон (например, хедер)
- `bg-bg-tertiary` - Третичный фон
- `bg-bg-card` - Фон карточек и блоков
- `bg-bg-input` - Фон полей ввода

### Текст
- `text-text-primary` - Основной текст
- `text-text-secondary` - Вторичный текст
- `text-text-tertiary` - Третичный текст (placeholder, disabled)
- `text-text-muted` - Приглушённый текст

### Границы
- `border-border-primary` - Основные границы
- `border-border-secondary` - Вторичные границы
- `border-border-tertiary` - Третичные границы

### Акцентные цвета
- `text-accent` / `bg-accent` - Основной акцентный цвет
- `text-accent-hover` / `bg-accent-hover` - Акцентный цвет при наведении
- `bg-accent-light` - Светлый акцентный фон

## Использование

### Вместо хардкоженных значений

❌ **Плохо:**
```tsx
<div className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-[#e5e5e5]">
```

✅ **Хорошо:**
```tsx
<div className="bg-bg-card text-text-primary">
```

### Автоматическое переключение

Токены автоматически меняют значения в зависимости от наличия класса `dark` на элементе `<html>`. Не нужно использовать префикс `dark:` для токенов.

```tsx
// Автоматически работает для обеих тем
<div className="bg-bg-primary text-text-primary border-border-primary">
```

### Для специальных случаев

Если нужно явно указать цвет для конкретной темы, можно использовать стандартные Tailwind классы:

```tsx
<div className="bg-bg-card text-text-primary hover:text-orange-600 dark:hover:text-orange-500">
```

## Значения токенов

### Светлая тема
- `--color-bg-primary: #f9fafb` (gray-50)
- `--color-bg-card: #ffffff` (white)
- `--color-text-primary: #111827` (gray-900)
- `--color-text-secondary: #6b7280` (gray-500)
- `--color-border-primary: #e5e7eb` (gray-200)
- `--color-accent: #ea580c` (orange-600)

### Тёмная тема
- `--color-bg-primary: #0a0a0a` (почти чёрный)
- `--color-bg-card: #1a1a1a` (тёмно-серый)
- `--color-text-primary: #e5e5e5` (светло-серый)
- `--color-text-secondary: #a0a0a0` (серый)
- `--color-border-primary: #2a2a2a` (тёмно-серый)
- `--color-accent: #f97316` (orange-500)

## Миграция

Все хардкоженные hex-коды были заменены на токены. Если вы видите старые паттерны, замените их:

1. `dark:bg-[#0a0a0a]` → `bg-bg-primary`
2. `dark:bg-[#1a1a1a]` → `bg-bg-card`
3. `dark:text-[#e5e5e5]` → `text-text-primary`
4. `dark:text-[#a0a0a0]` → `text-text-secondary`
5. `dark:border-[#2a2a2a]` → `border-border-primary`

## Преимущества

1. **Единая точка управления** - все цвета определены в одном месте
2. **Легкое изменение тем** - достаточно изменить значения переменных
3. **Типобезопасность** - Tailwind проверяет существование классов
4. **Автоматическое переключение** - не нужно дублировать классы с `dark:`
5. **Читаемость** - семантические имена вместо hex-кодов

