type SectionSkeletonProps = {
  title?: boolean
  gridCols?: 'comics' | 'series'
  count?: number
}

export default function SectionSkeleton({ 
  title = true, 
  gridCols = 'comics',
  count = 6 
}: SectionSkeletonProps) {
  return (
    <section className="py-12 bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <div className="mb-8">
            <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
          </div>
        )}
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-${gridCols === 'comics' ? '6' : '6'} gap-4`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="overflow-hidden group animate-pulse">
              <div className="relative aspect-[2/3] bg-bg-tertiary rounded" />
              <div className="pt-3 space-y-2">
                <div className="h-4 bg-bg-tertiary rounded w-3/4" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

