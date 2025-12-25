'use client'

import Link from 'next/link'
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'
import BottomSheet from '@/components/ui/BottomSheet'
import { formatDate } from '@/lib/utils'

interface TranslationBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  translation: {
    siteName: string
    siteId: string
    site2Name?: string | null
    site2Id?: string | null
    translate: string
    edit: string
    date: Date | null
    link: string
  } | null
}

export default function TranslationBottomSheet({ isOpen, onClose, translation }: TranslationBottomSheetProps) {
  if (!translation) return null

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Информация о переводе">
      <div className="space-y-3">
        {/* Сайт-переводчик */}
        <div className="flex items-center justify-between py-2 border-b border-border-primary">
          <span className="text-sm text-text-secondary">Сайт</span>
          <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
            <Link
              href={`/sites/${translation.siteId}`}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors text-right"
            >
              {translation.siteName}
            </Link>
            {translation.site2Name && translation.site2Id && (
              <>
                <span className="text-text-tertiary">,</span>
                <Link
                  href={`/sites/${translation.site2Id}`}
                  className="text-sm font-medium text-text-primary hover:text-accent transition-colors text-right"
                >
                  {translation.site2Name}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Переводчик */}
        {translation.translate && (
          <div className="flex items-center justify-between py-2 border-b border-border-primary">
            <span className="text-sm text-text-secondary">Перевод</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {translation.translate.split(',').map((name, idx) => {
                const trimmed = name.trim()
                if (!trimmed) return null
                return (
                  <Link
                    key={idx}
                    href={`/search?q=${encodeURIComponent(trimmed)}&type=scanlator&tab=scanlators`}
                    className="text-sm text-text-primary hover:text-accent hover:underline text-right"
                  >
                    {trimmed}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Оформление */}
        {translation.edit && (
          <div className="flex items-center justify-between py-2 border-b border-border-primary">
            <span className="text-sm text-text-secondary">Оформление</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {translation.edit.split(',').map((name, idx) => {
                const trimmed = name.trim()
                if (!trimmed) return null
                return (
                  <Link
                    key={idx}
                    href={`/search?q=${encodeURIComponent(trimmed)}&type=scanlator&tab=scanlators`}
                    className="text-sm text-text-primary hover:text-accent hover:underline text-right"
                  >
                    {trimmed}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Дата перевода */}
        <div className="flex items-center justify-between py-2 border-b border-border-primary">
          <span className="text-sm text-text-secondary">Дата</span>
          <span className="text-sm text-text-primary">
            {translation.date ? formatDate(translation.date) : '-'}
          </span>
        </div>

        {/* Кнопка скачать с отступом снизу для safe area */}
        <div className="pt-4 pb-6">
          {translation.link ? (
            <a
              href={translation.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors font-medium"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Скачать
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-bg-tertiary text-text-tertiary rounded-xl cursor-not-allowed"
            >
              <XMarkIcon className="w-5 h-5" />
              Ссылка недоступна
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
