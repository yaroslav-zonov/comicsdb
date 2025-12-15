/**
 * Конфигурация приложения
 * Все магические числа и константы вынесены сюда для удобства управления
 */

export const APP_CONFIG = {
  // Пагинация
  pagination: {
    defaultPageSize: 100,
    publishersPageSize: 100,
    comicsPageSize: 50,
    seriesPageSize: 48,
    searchPageSize: 100,
  },

  // Кэширование (ISR revalidate в секундах)
  revalidate: {
    homePage: 30,
    publishers: 60,
    genres: 60,
    sites: 60,
    stats: 300, // 5 минут
  },

  // Свежие релизы
  freshReleases: {
    daysAgo: 7, // Показывать релизы за последние N дней
    limit: 200, // Максимальное количество релизов
  },

  // Лимиты запросов
  limits: {
    maxSearchResults: 1000,
    maxComicsPerPage: 100,
    maxSeriesPerPublisher: 500,
  },

  // Изображения
  images: {
    placeholderDataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+',
    comicCardWidth: 200,
    comicCardHeight: 300,
    thumbnailWidth: 96,
    thumbnailHeight: 144,
  },

  // Сайт
  site: {
    name: 'ComicsDB.ru',
    description: 'База данных комиксов на русском языке',
    url: 'https://comicsdb.ru',
  },
} as const

export type AppConfig = typeof APP_CONFIG
