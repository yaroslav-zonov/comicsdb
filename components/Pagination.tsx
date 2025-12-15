import Link from 'next/link'

type PaginationProps = {
  total: number
  page: number
  pageSize: number
  getPageLink: (pageNum: number) => string
}

export default function Pagination({ total, page, pageSize, getPageLink }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages: (number | string)[] = []
  const maxVisible = 7

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    if (page <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages)
    } else if (page >= totalPages - 2) {
      pages.push(1)
      pages.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = page - 1; i <= page + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages)
    }
  }

  return (
    <div className="flex justify-center items-center gap-2 flex-wrap mt-6">
      {page > 1 && (
        <Link
          href={getPageLink(page - 1)}
          className="pagination-btn"
        >
          ←
        </Link>
      )}
      {pages.map((p, idx) => {
        if (p === '...') {
          return (
            <span key={`ellipsis-${idx}`} className="px-2 text-text-tertiary">
              ...
            </span>
          )
        }
        const pageNum = p as number
        return pageNum === page ? (
          <span
            key={pageNum}
            className="pagination-active"
          >
            {pageNum}
          </span>
        ) : (
          <Link
            key={pageNum}
            href={getPageLink(pageNum)}
            className="pagination-btn"
          >
            {pageNum}
          </Link>
        )
      })}
      {page < totalPages && (
        <Link
          href={getPageLink(page + 1)}
          className="pagination-btn"
        >
          →
        </Link>
      )}
    </div>
  )
}

