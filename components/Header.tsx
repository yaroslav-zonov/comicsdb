'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      window.location.href = `/search?q=${encodeURIComponent(trimmed)}`
    }
  }

  return (
    <header className="bg-bg-card border-b border-border-secondary sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Первая строка: Лого и навигация */}
        <div className="flex items-center justify-between h-14 border-b border-border-secondary">
          {/* Логотип */}
          <div className="flex items-center">
            <Link href="/" className="text-lg font-semibold text-text-primary hover:text-accent transition-colors">
              База переводов комиксов
            </Link>
          </div>

          {/* Навигация */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex items-center space-x-6">
              <Link href="/comics" className="text-text-primary hover:text-accent transition-colors">
                Комиксы
              </Link>
              <Link href="/publishers" className="text-text-primary hover:text-accent transition-colors">
                Издательства
              </Link>
              <Link href="/sites" className="text-text-primary hover:text-accent transition-colors">
                Сайты
              </Link>
              <Link href="/genres" className="text-text-primary hover:text-accent transition-colors">
                Жанры
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
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              F.A.Q.
            </Link>
            <Link
              href="/stats"
              className="text-text-secondary hover:text-text-primary transition-colors"
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
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-accent"
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
          <div className="md:hidden border-t border-border-secondary py-4">
            {/* Навигация */}
            <nav className="flex flex-col space-y-3 mb-4">
              <Link href="/comics" className="text-text-primary hover:text-accent transition-colors">
                Комиксы
              </Link>
              <Link href="/publishers" className="text-text-primary hover:text-accent transition-colors">
                Издательства
              </Link>
              <Link href="/sites" className="text-text-primary hover:text-accent transition-colors">
                Сайты
              </Link>
              <Link href="/genres" className="text-text-primary hover:text-accent transition-colors">
                Жанры
              </Link>
            </nav>


            {/* Социальные ссылки */}
            <div className="flex flex-wrap items-center gap-3 text-sm pt-4 border-t border-border-secondary">
              <a href="https://vk.com/comicsdb" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-blue-600 dark:hover:text-blue-400">
                ВКонтакте
              </a>
              <a href="https://t.me/comicsdatabase" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-blue-500 dark:hover:text-blue-400">
                Telegram
              </a>
              <Link href="/rss" className="text-text-secondary hover:text-accent">
                RSS
              </Link>
              <Link href="/faq" className="text-text-secondary hover:text-text-primary">
                F.A.Q.
              </Link>
              <Link href="/stats" className="text-text-secondary hover:text-text-primary">
                Статистика
              </Link>
            </div>
          </div>
        )}

      </div>
    </header>
  )
}

