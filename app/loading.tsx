export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-bg-tertiary border-t-accent mb-4"></div>
          <p className="text-text-secondary">Загрузка...</p>
        </div>
      </div>
    </div>
  )
}

