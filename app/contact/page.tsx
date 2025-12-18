import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default function ContactPage() {
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
              <li className="text-text-primary">Контакты</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">Контакты</h1>

          {/* Контент */}
          <div className="bg-bg-card rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Связь с администрацией
              </h2>
              <p className="text-text-secondary mb-4">
                По всем вопросам, связанным с проектом ComicsDB, вы можете связаться с нами:
              </p>
              <ul className="space-y-3 text-text-secondary">
                <li>
                  <strong>ВКонтакте:</strong>{' '}
                  <a
                    href="https://vk.com/comicsdb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-secondary hover:text-accent transition-colors"
                  >
                    vk.com/comicsdb
                  </a>
                </li>
                <li>
                  <strong>Telegram:</strong>{' '}
                  <a
                    href="https://t.me/comicsdatabase"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-secondary hover:text-accent transition-colors"
                  >
                    t.me/comicsdatabase
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Добавление переводов
              </h2>
              <p className="text-text-secondary">
                Если вы хотите добавить свои переводы в базу данных, свяжитесь с нами через 
                социальные сети. Мы рассмотрим вашу заявку и добавим информацию о ваших переводах.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Сообщить об ошибке
              </h2>
              <p className="text-text-secondary">
                Если вы обнаружили ошибку в данных или работе сайта, пожалуйста, сообщите нам 
                через социальные сети. Мы постараемся исправить проблему как можно скорее.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Предложения по улучшению
              </h2>
              <p className="text-text-secondary">
                Мы всегда открыты к предложениям по улучшению проекта. Если у вас есть идеи, 
                как сделать ComicsDB лучше, поделитесь ими с нами!
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

