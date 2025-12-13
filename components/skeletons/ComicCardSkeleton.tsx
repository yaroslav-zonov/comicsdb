export default function ComicCardSkeleton() {
  return (
    <div className="overflow-hidden group animate-pulse">
      <div className="relative aspect-[2/3] bg-bg-tertiary rounded" />
      <div className="pt-3 space-y-2">
        <div className="h-4 bg-bg-tertiary rounded w-3/4" />
        <div className="h-3 bg-bg-tertiary rounded w-1/2" />
      </div>
    </div>
  )
}

