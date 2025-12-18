'use client'

import { useState, ReactNode } from 'react'

interface AccordionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export default function Accordion({ title, children, defaultOpen = false, className = '' }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`border-b border-border-primary ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 flex items-center justify-between text-left"
      >
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-4">
          {children}
        </div>
      )}
    </div>
  )
}
