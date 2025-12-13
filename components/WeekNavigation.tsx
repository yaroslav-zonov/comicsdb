'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

type WeekNavigationProps = {
  currentStart: Date
  currentEnd: Date
  prevWeekStart: Date
  prevWeekEnd: Date
  nextWeekStart: Date
  nextWeekEnd: Date
  isCurrentWeek: boolean
  availableYears: number[]
}

function formatWeekRange(start: Date, end: Date): string {
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return `${formatDateStr(start)}_${formatDateStr(end)}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Понедельник
  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function getWeekEnd(start: Date): Date {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export default function WeekNavigation({
  currentStart,
  currentEnd,
  prevWeekStart,
  prevWeekEnd,
  nextWeekStart,
  nextWeekEnd,
  isCurrentWeek,
  availableYears,
}: WeekNavigationProps) {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(currentStart.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentStart.getMonth() + 1)

  // Обновляем выбранные значения при изменении текущей недели
  useEffect(() => {
    setSelectedYear(currentStart.getFullYear())
    setSelectedMonth(currentStart.getMonth() + 1)
  }, [currentStart])

  // Используем годы из базы данных, отсортированные по убыванию
  const years = [...availableYears].sort((a, b) => b - a)

  // Генерируем список месяцев
  const months = [
    { value: 1, label: 'Январь' },
    { value: 2, label: 'Февраль' },
    { value: 3, label: 'Март' },
    { value: 4, label: 'Апрель' },
    { value: 5, label: 'Май' },
    { value: 6, label: 'Июнь' },
    { value: 7, label: 'Июль' },
    { value: 8, label: 'Август' },
    { value: 9, label: 'Сентябрь' },
    { value: 10, label: 'Октябрь' },
    { value: 11, label: 'Ноябрь' },
    { value: 12, label: 'Декабрь' },
  ]

  const handleYearChange = (year: number) => {
    const newYear = Number(year)
    setSelectedYear(newYear)
    // Находим неделю, содержащую середину выбранного месяца
    const date = new Date(newYear, selectedMonth - 1, 15)
    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(weekStart)
    router.push(`/weeks/${formatWeekRange(weekStart, weekEnd)}`)
  }

  const handleMonthChange = (month: number) => {
    const newMonth = Number(month)
    setSelectedMonth(newMonth)
    // Находим неделю, содержащую середину выбранного месяца
    const date = new Date(selectedYear, newMonth - 1, 15)
    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(weekStart)
    router.push(`/weeks/${formatWeekRange(weekStart, weekEnd)}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Навигация по неделям */}
      <div className="flex gap-4 items-center flex-wrap">
        <Link
          href={`/weeks/${formatWeekRange(prevWeekStart, prevWeekEnd)}`}
          className="text-accent hover:text-accent-hover font-medium"
        >
          ← Предыдущая неделя
        </Link>
        <span className="text-text-tertiary">|</span>
        
        {/* Селекторы года и месяца */}
        <div className="flex gap-2 items-center">
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="text-sm border border-border-secondary rounded px-3 py-1 bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="text-sm border border-border-secondary rounded px-3 py-1 bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
        
        <span className="text-text-tertiary">|</span>
        {isCurrentWeek ? (
          <span className="text-text-tertiary font-medium cursor-not-allowed">
            Следующая неделя →
          </span>
        ) : (
          <Link
            href={`/weeks/${formatWeekRange(nextWeekStart, nextWeekEnd)}`}
            className="text-accent hover:text-accent-hover font-medium"
          >
            Следующая неделя →
          </Link>
        )}
      </div>
    </div>
  )
}

