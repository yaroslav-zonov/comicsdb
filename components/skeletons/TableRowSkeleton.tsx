export default function TableRowSkeleton() {
  return (
    <tr className="border-t border-border-primary animate-pulse">
      <td className="py-3">
        <div className="w-12 aspect-[2/3] bg-bg-tertiary rounded" />
      </td>
      <td className="py-3">
        <div className="space-y-2">
          <div className="h-4 bg-bg-tertiary rounded w-48" />
          <div className="h-3 bg-bg-tertiary rounded w-32" />
        </div>
      </td>
      <td className="py-3">
        <div className="h-4 bg-bg-tertiary rounded w-24" />
      </td>
      <td className="py-3">
        <div className="h-4 bg-bg-tertiary rounded w-20" />
      </td>
      <td className="py-3">
        <div className="h-4 bg-bg-tertiary rounded w-16" />
      </td>
    </tr>
  )
}

