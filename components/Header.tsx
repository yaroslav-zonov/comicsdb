'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const pathname = usePathname()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      window.location.href = `/search?q=${encodeURIComponent(trimmed)}`
    }
  }

  const isActive = (path: string) => {
    if (path === '/comics') {
      return pathname.startsWith('/weeks') || pathname === '/comics'
    }
    return pathname.startsWith(path)
  }

  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY

      // Только для мобильных устройств (< 768px)
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Скролл вниз - скрываем хедер
          setIsVisible(false)
        } else {
          // Скролл вверх или в начале страницы - показываем хедер
          setIsVisible(true)
        }
      } else {
        // На десктопе всегда показываем
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', controlHeader)

    return () => {
      window.removeEventListener('scroll', controlHeader)
    }
  }, [lastScrollY])

  return (
    <header className={`relative header-bg backdrop-blur-md border-b border-border-primary sticky top-0 z-50 shadow-sm transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      {/* Градиентная подложка для улучшения контраста */}
      <div className="absolute inset-0 header-gradient pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Первая строка: Лого и навигация */}
        <div className="flex items-center justify-between h-14 border-b border-border-primary">
          {/* Логотип */}
          <div className="flex items-center">
            <Link href="/" className="text-lg font-semibold text-text-primary hover:text-accent transition-colors duration-200">
              База переводов комиксов
            </Link>
          </div>

          {/* Навигация */}
          <div className="hidden md:flex items-center space-x-1">
            <nav className="flex items-center space-x-1">
              <Link
                href="/comics"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/comics')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Комиксы
              </Link>
              <Link
                href="/publishers"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/publishers')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Издательства
              </Link>
              <Link
                href="/sites"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/sites')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Сайты
              </Link>
              <Link
                href="/genres"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/genres')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Жанры
              </Link>
              <Link
                href="/globals"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/globals')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                События
              </Link>
            </nav>

          </div>

          {/* Кнопка мобильного меню */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            aria-label="Меню"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Вторая строка: Социалки слева, поиск справа */}
        <div className="flex items-center justify-between h-12">
          {/* Социальные ссылки - скрыты на мобильных */}
          <div className="hidden md:flex items-center space-x-4 text-sm">
            <a
              href="https://vk.com/comicsdb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              ВКонтакте
            </a>
            <a
              href="https://t.me/comicsdatabase"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Telegram
            </a>
            <Link
              href="/rss"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              RSS
            </Link>
            <Link
              href="/faq"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              F.A.Q.
            </Link>
            <Link
              href="/stats"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              Статистика
            </Link>
          </div>

          {/* Поиск - полная ширина на мобильных */}
          <div className="flex-1 md:max-w-md md:ml-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск комиксов, серий..."
                className="input-search"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-accent transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-primary py-4 fade-in">
            {/* Навигация */}
            <nav className="flex flex-col space-y-2 mb-4">
              <Link
                href="/comics"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/comics')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Комиксы
              </Link>
              <Link
                href="/publishers"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/publishers')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Издательства
              </Link>
              <Link
                href="/sites"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/sites')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Сайты
              </Link>
              <Link
                href="/genres"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/genres')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                Жанры
              </Link>
              <Link
                href="/globals"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/globals')
                    ? 'text-accent bg-accent-50 dark:bg-accent-100'
                    : 'text-text-primary hover:text-accent hover:bg-accent-50/50 dark:hover:bg-accent-100/50'
                }`}
              >
                События
              </Link>
            </nav>


            {/* Социальные ссылки */}
            <div className="flex flex-wrap items-center gap-3 text-sm pt-4 border-t border-border-primary">
              <a href="https://vk.com/comicsdb" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-blue-600 dark:hover:text-blue-400">
                ВКонтакте
              </a>
              <a href="https://t.me/comicsdatabase" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-blue-500 dark:hover:text-blue-400">
                Telegram
              </a>
              <Link href="/rss" className="text-text-secondary hover:text-accent">
                RSS
              </Link>
              <Link href="/faq" className="text-text-secondary hover:text-accent">
                F.A.Q.
              </Link>
              <Link href="/stats" className="text-text-secondary hover:text-accent">
                Статистика
              </Link>
            </div>
          </div>
        )}

      </div>
    </header>
  )
}

