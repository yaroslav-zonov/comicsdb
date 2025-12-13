import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
        <p className="text-xl text-text-secondary mb-8">Страница не найдена</p>
        <Link
          href="/"
          className="px-6 py-2 bg-orange-600 dark:bg-orange-500 text-text-primary rounded-lg hover:bg-orange-700 dark:hover:bg-orange-400 transition-colors"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  )
}

