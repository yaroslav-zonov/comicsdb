'use client'

import {
  Squares2X2Icon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

export type ViewMode = 'cards' | 'table'

export type ViewToggleProps = {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  showTableOnMobile?: boolean
  className?: string
}

export default function ViewToggle({
  viewMode,
  onViewModeChange,
  showTableOnMobile = false,
  className = '',
}: ViewToggleProps) {
  // Скрываем весь тоггл на маленьких экранах, если таблица недоступна
  const containerClass = showTableOnMobile 
    ? `flex gap-1 ${className}` 
    : `hidden md:flex gap-1 ${className}`

  return (
    <div className={containerClass}>
      <button
        onClick={() => onViewModeChange('cards')}
        className={`p-2 rounded transition-colors ${
          viewMode === 'cards'
            ? 'text-text-primary'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
        title="Карточки"
      >
        <Squares2X2Icon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        className={`p-2 rounded transition-colors ${
          viewMode === 'table'
            ? 'text-text-primary'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
        title="Таблица"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>
    </div>
  )
}

