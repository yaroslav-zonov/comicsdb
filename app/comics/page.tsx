import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

function formatWeekRange(start: Date, end: Date): string {
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return `${formatDateStr(start)}_${formatDateStr(end)}`
}

function getCurrentWeek(): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Понедельник
  const start = new Date(now)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export default async function ComicsPage() {
  // Редирект на текущую неделю
  const currentWeek = getCurrentWeek()
  const weekRange = formatWeekRange(currentWeek.start, currentWeek.end)
  redirect(`/weeks/${weekRange}`)
}
