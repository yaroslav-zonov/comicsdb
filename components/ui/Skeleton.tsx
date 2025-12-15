export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Базовый компонент скелетона для loading состояний
 * Использует animate-pulse для плавной анимации
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-bg-tertiary rounded ${className}`}
      {...props}
    />
  )
}

/**
 * Скелетон для карточки комикса/серии
 * Стандартный формат 2:3 с заголовком и подзаголовком
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden group ${className}`}>
      <Skeleton className="aspect-[2/3] w-full rounded" />
      <div className="pt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

/**
 * Скелетон для строки таблицы
 */
export function TableRowSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <tr className="table-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Скелетон для секции контента
 */
export function SectionSkeleton({
  title = true,
  lines = 3,
  className = ''
}: {
  title?: boolean
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && <Skeleton className="h-8 w-1/3 mb-6" />}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${100 - (i * 10)}%` }}
          />
        ))}
      </div>
    </div>
  )
}
