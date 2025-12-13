'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Что-то пошло не так</h1>
        <p className="text-text-secondary mb-6">
          {error.message || 'Произошла ошибка при загрузке страницы'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-orange-600 dark:bg-orange-500 text-text-primary rounded-lg hover:bg-orange-700 dark:hover:bg-orange-400 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}

