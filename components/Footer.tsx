import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-bg-primary text-text-secondary border-t border-border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Основная информация */}
          <div className="text-center md:text-left">
            <h3 className="text-text-primary font-bold text-lg mb-2">ComicsDB</h3>
            <p className="text-sm mb-2">
              База русских переводов комиксов. Более 56,000 выпусков.
            </p>
            <p className="text-xs text-text-tertiary">
              Данные о комиксах из{' '}
              <a
                href="https://comicvine.gamespot.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Comicvine API
              </a>
            </p>
          </div>

          {/* Социальные сети и полезные ссылки */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex items-center gap-4">
              <a
                href="https://vk.com/comicsdb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary hover:text-blue-500 transition-colors"
                title="ВКонтакте"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.785 16.241s.287-.029.435-.18c.135-.135.132-.388.132-.388s-.02-1.123.515-1.288c.526-.165 1.2 1.1 1.912 1.586.54.368.95.287.95.287l1.912-.029s1-.064.525-.85c-.039-.07-.277-.58-1.43-1.64-1.21-1.128-1.045-.945.41-2.895.28-.38.393-.612.393-.612s.043-.26-.06-.45c-.103-.19-.74-.16-.74-.16l-2.13.013s-.158-.022-.275.05c-.117.072-.19.24-.19.24s-.34.91-.79 1.684c-.95 1.61-1.33 1.696-1.485 1.595-.36-.237-.27-.95-.27-1.456 0-1.585.24-2.25-.47-2.42-.236-.056-.41-.092-1.015-.098-.775-.008-1.43.003-1.8.19-.247.123-.435.395-.32.411.144.02.47.165.64.6.224.56.22 1.82.22 1.82s.13 1.92-.31 2.16c-.306.165-.73-.172-1.64-1.73-.465-.81-.816-1.705-.816-1.705s-.067-.2-.187-.308c-.144-.135-.345-.178-.345-.178l-2.03.013s-.31.01-.424.15c-.103.125-.008.384-.008.384s1.61 3.76 3.43 5.66c1.67 1.75 3.58 1.63 3.58 1.63h.85s.256.016.393-.123c.12-.12.093-.31.093-.31s-.013-1.12.6-1.28c.61-.16 1.4 1.1 2.24 1.59.61.36 1.07.28 1.07.28l2.18-.03s1.15-.07.6-.94c-.04-.07-.29-.6-1.48-1.7z"/>
                </svg>
              </a>
              <a
                href="https://t.me/comicsdatabase"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary hover:text-blue-400 transition-colors"
                title="Telegram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <Link
                href="/rss"
                className="text-text-tertiary hover:text-accent transition-colors"
                title="RSS"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046 19.152 8.594 19.183 19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z"/>
                </svg>
              </Link>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/about" className="text-text-secondary hover:text-accent transition-colors">
                О проекте
              </Link>
              <Link href="/faq" className="text-text-secondary hover:text-accent transition-colors">
                F.A.Q.
              </Link>
              <Link href="/stats" className="text-text-secondary hover:text-accent transition-colors">
                Статистика
              </Link>
              <Link href="/contact" className="text-text-secondary hover:text-accent transition-colors">
                Контакты
              </Link>
            </div>
            <p className="text-xs text-text-tertiary">
              © {currentYear} ComicsDB
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

