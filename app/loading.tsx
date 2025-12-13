export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Скелетон заголовка */}
            <div className="h-10 w-64 bg-bg-tertiary rounded animate-pulse" />
            
            {/* Скелетон контента */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-bg-card rounded-lg shadow p-6">
                  <div className="aspect-[2/3] bg-bg-tertiary rounded mb-4 animate-pulse" />
                  <div className="h-4 bg-bg-tertiary rounded mb-2 animate-pulse" />
                  <div className="h-4 bg-bg-tertiary rounded w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

