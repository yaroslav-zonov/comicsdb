import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default function FAQPage() {
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
              <li className="text-text-primary">F.A.Q.</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">Часто задаваемые вопросы</h1>

          {/* Контент */}
          <div className="bg-bg-card rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Что такое ComicsDB?
              </h2>
              <p className="text-text-secondary">
                ComicsDB — это база данных русских переводов комиксов. Мы каталогизируем переводы, 
                выполненные различными командами переводчиков, и предоставляем удобный поиск по сериям, 
                персонажам, авторам и командам.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Как искать комиксы?
              </h2>
              <p className="text-text-primary mb-2">
                Используйте поисковую строку в шапке сайта. Поиск работает по:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li>Сериям — частичный поиск по названию</li>
                <li>Персонажам — точное совпадение</li>
                <li>Авторам — точное совпадение</li>
                <li>Командам — точное совпадение</li>
                <li>Сканлейтерам — точное совпадение</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Как добавить свой перевод?
              </h2>
              <p className="text-text-secondary">
                Для добавления переводов в базу данных свяжитесь с администрацией проекта через 
                <Link href="/contact" className="text-text-secondary hover:text-accent transition-colors ml-1">
                  форму обратной связи
                </Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Откуда берутся данные?
              </h2>
              <p className="text-text-secondary">
                Данные о комиксах берутся из API Comicvine. Информация о переводах добавляется 
                администраторами проекта на основе данных, предоставленных командами переводчиков.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Как часто обновляется база?
              </h2>
              <p className="text-text-secondary">
                База данных обновляется регулярно по мере поступления новых переводов. 
                Вы можете подписаться на <Link href="/rss" className="text-text-secondary hover:text-accent transition-colors">RSS ленту</Link>, 
                чтобы получать уведомления о новых релизах.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Есть ли API?
              </h2>
              <p className="text-text-secondary">
                Да, доступны API endpoints для получения данных о комиксах, сериях и издательствах. 
                Подробнее смотрите в <Link href="/about" className="text-text-secondary hover:text-accent transition-colors">документации</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

