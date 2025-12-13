import ComicCardSkeleton from '@/components/skeletons/ComicCardSkeleton'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Скелетон заголовка */}
            <div className="h-10 w-64 bg-bg-tertiary rounded animate-pulse" />
            
            {/* Скелетон контента - используем правильные скелетоны */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <ComicCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

