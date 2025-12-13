import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Хлебные крошки */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center space-x-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">О проекте</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">О проекте</h1>

          {/* Контент */}
          <div className="bg-bg-card rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Что такое ComicsDB?
              </h2>
              <p className="text-text-secondary">
                ComicsDB — это современная база данных русских переводов комиксов. Проект создан 
                для каталогизации переводов, выполненных различными командами переводчиков, и 
                предоставления удобного поиска по огромному массиву переведенных комиксов.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Цели проекта
              </h2>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Каталогизация всех русских переводов комиксов</li>
                <li>Предоставление удобного поиска по сериям, персонажам, авторам и командам</li>
                <li>Отслеживание статистики переводов и сканлейтеров</li>
                <li>Создание единой точки доступа к информации о переводах</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Технологии
              </h2>
              <p className="text-text-primary mb-2">
                Проект построен на современных технологиях:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li><strong>Next.js 14+</strong> — React фреймворк с SSR/SSG</li>
                <li><strong>TypeScript</strong> — типизация кода</li>
                <li><strong>Prisma ORM</strong> — работа с базой данных</li>
                <li><strong>MySQL</strong> — реляционная база данных</li>
                <li><strong>Tailwind CSS</strong> — стилизация</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                API
              </h2>
              <p className="text-text-primary mb-2">
                Доступны следующие API endpoints:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li><code className="bg-gray-100 px-1 rounded">GET /api/comics</code> — список комиксов</li>
                <li><code className="bg-gray-100 px-1 rounded">GET /api/series</code> — список серий</li>
                <li><code className="bg-gray-100 px-1 rounded">GET /api/publishers</code> — список издательств</li>
                <li><code className="bg-gray-100 px-1 rounded">GET /api/health</code> — проверка состояния БД</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Источники данных
              </h2>
              <p className="text-text-secondary">
                Данные о комиксах берутся из <a href="https://comicvine.gamespot.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">Comicvine API</a>. 
                Информация о переводах добавляется администраторами проекта на основе данных, 
                предоставленных командами переводчиков.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Контакты
              </h2>
              <p className="text-text-secondary">
                По вопросам и предложениям обращайтесь через{' '}
                <Link href="/contact" className="text-accent hover:text-accent-hover hover:text-accent">
                  форму обратной связи
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

