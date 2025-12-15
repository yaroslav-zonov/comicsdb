'use client'

import Link from 'next/link'
import { getComicUrl } from '@/lib/utils'

interface ComicNavigationFABProps {
  publisherId: number
  seriesId: number
  prevIssue: { comicvine: number; number: number } | null
  nextIssue: { comicvine: number; number: number } | null
}

/**
 * Floating Action Button для навигации между выпусками комиксов на мобильных устройствах
 * Отображается только на экранах меньше md (768px)
 */
export default function ComicNavigationFAB({
  publisherId,
  seriesId,
  prevIssue,
  nextIssue,
}: ComicNavigationFABProps) {
  // Если нет ни предыдущего, ни следующего выпуска, не показываем FAB
  if (!prevIssue && !nextIssue) {
    return null
  }

  return (
    <div className="fab-container">
      <div className="fab-nav">
        {prevIssue ? (
          <Link
            href={getComicUrl(publisherId, seriesId, prevIssue.comicvine)}
            className="fab-btn fab-btn-prev"
            aria-label={`Предыдущий выпуск #${prevIssue.number}`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-xs font-medium">#{prevIssue.number}</span>
          </Link>
        ) : (
          <div className="fab-btn fab-btn-disabled">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
        )}

        <div className="fab-divider" />

        {nextIssue ? (
          <Link
            href={getComicUrl(publisherId, seriesId, nextIssue.comicvine)}
            className="fab-btn fab-btn-next"
            aria-label={`Следующий выпуск #${nextIssue.number}`}
          >
            <span className="text-xs font-medium">#{nextIssue.number}</span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ) : (
          <div className="fab-btn fab-btn-disabled">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
