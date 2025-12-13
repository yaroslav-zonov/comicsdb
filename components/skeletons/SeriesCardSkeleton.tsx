export default function SeriesCardSkeleton() {
  return (
    <div className="overflow-hidden group animate-pulse">
      <div className="relative aspect-[2/3] bg-bg-tertiary rounded" />
      <div className="pt-3">
        <div className="h-4 bg-bg-tertiary rounded w-full mb-1" />
        <div className="h-3 bg-bg-tertiary rounded w-2/3" />
      </div>
    </div>
  )
}

