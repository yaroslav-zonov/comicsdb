'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type SortSelectProps = {
  currentSort: string
  options: { value: string; label: string }[]
  paramName?: string
}

export default function SortSelect({ currentSort, options, paramName = 'sort' }: SortSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, value)
    params.set('page', '1') // Сбрасываем на первую страницу при смене сортировки
    router.push(`?${params.toString()}`)
  }

  return (
    <select
      value={currentSort}
      onChange={(e) => handleChange(e.target.value)}
      className="text-sm border border-border-secondary rounded px-3 py-1 bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

