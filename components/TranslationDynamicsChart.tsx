'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from 'recharts'

type DataPoint = {
  date: string
  count: number
  year: number
  month: number
}

type TranslationDynamicsChartProps = {
  data: DataPoint[]
}

export default function TranslationDynamicsChart({ data }: TranslationDynamicsChartProps) {
  // Определяем тему
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [])

  // Преобразуем данные для Recharts
  const chartData = useMemo(() => {
    return data.map(d => ({
      date: d.date,
      count: d.count,
      year: d.year,
      month: d.month,
    }))
  }, [data])

  // Вычисляем последние 5 лет для начального отображения
  const initialRange = useMemo(() => {
    if (chartData.length === 0) return { startIndex: 0, endIndex: 0 }
    
    const lastYear = chartData[chartData.length - 1].year
    const fiveYearsAgo = lastYear - 5
    
    const startIndex = chartData.findIndex(d => d.year >= fiveYearsAgo)
    const endIndex = chartData.length - 1
    
    if (startIndex === -1) return { startIndex: 0, endIndex: chartData.length - 1 }
    
    return { startIndex, endIndex }
  }, [chartData])

  const [brushStartIndex, setBrushStartIndex] = useState(initialRange.startIndex)
  const [brushEndIndex, setBrushEndIndex] = useState(initialRange.endIndex)

  // Адаптивные размеры
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const mainChartHeight = isMobile ? 280 : 360
  const miniChartHeight = isMobile ? 50 : 60

  // Получаем видимый диапазон данных
  const visibleData = chartData.slice(brushStartIndex, brushEndIndex + 1)
  const startDate = visibleData[0]?.date || ''
  const endDate = visibleData[visibleData.length - 1]?.date || ''

  // Вычисляем количество лет в видимом диапазоне
  const visibleYears = useMemo(() => {
    if (visibleData.length === 0) return 0
    const startYear = visibleData[0].year
    const endYear = visibleData[visibleData.length - 1].year
    return endYear - startYear + 1
  }, [visibleData])

  // Определяем грануляцию: если больше 5 лет - по годам, иначе по месяцам
  const shouldGroupByYear = visibleYears > 5

  // Группируем данные по годам, если нужно
  const groupedData = useMemo(() => {
    if (!shouldGroupByYear) return visibleData

    const yearMap = new Map<number, number>()
    visibleData.forEach(d => {
      const current = yearMap.get(d.year) || 0
      yearMap.set(d.year, current + d.count)
    })

    return Array.from(yearMap.entries())
      .map(([year, count]) => ({
        date: `${year}-01`,
        count,
        year,
        month: 1,
      }))
      .sort((a, b) => a.year - b.year)
  }, [visibleData, shouldGroupByYear])

  // Форматирование даты для подписей
  const formatDateLabel = (date: string) => {
    const [year, month] = date.split('-')
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  // Упрощенный формат для оси X
  const formatXAxis = (tickItem: string) => {
    const [year] = tickItem.split('-')
    return year
  }

  // Цвета для графика
  const accentColor = isDark ? '#f97316' : '#ea580c'
  const textSecondaryColor = isDark ? '#a0a0a0' : '#9ca3af'
  const gridColor = isDark ? 'rgba(229, 229, 229, 0.08)' : 'rgba(0, 0, 0, 0.06)'
  const brushFillColor = isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(234, 88, 12, 0.2)'
  const brushStrokeColor = isDark ? '#f97316' : '#ea580c'

  // Кастомный тултип
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-bg-card border border-border-primary rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-medium text-text-primary">
            {shouldGroupByYear ? `${data.year} год` : formatDateLabel(data.date)}
          </p>
          <p className="text-sm text-accent font-medium">
            {data.count.toLocaleString('ru-RU')} переводов
          </p>
        </div>
      )
    }
    return null
  }

  // Используем ref для предотвращения бесконечных циклов
  const brushIndicesRef = useRef({ start: brushStartIndex, end: brushEndIndex })
  
  useEffect(() => {
    brushIndicesRef.current = { start: brushStartIndex, end: brushEndIndex }
  }, [brushStartIndex, brushEndIndex])

  // Упрощенный обработчик изменения brush
  const handleBrushChange = useCallback((domain: { startIndex?: number; endIndex?: number } | null) => {
    if (!domain) return
    
    const currentStart = brushIndicesRef.current.start
    const currentEnd = brushIndicesRef.current.end
    
    if (domain.startIndex !== undefined && domain.startIndex !== currentStart) {
      setBrushStartIndex(domain.startIndex)
    }
    
    if (domain.endIndex !== undefined && domain.endIndex !== currentEnd) {
      setBrushEndIndex(domain.endIndex)
    }
  }, [])

  if (data.length === 0) {
    return <p className="text-text-secondary">Нет данных для отображения</p>
  }

  return (
    <div className="bg-bg-card rounded-lg shadow p-4 md:p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-6">Динамика переводов</h3>
      <div className="w-full">
        {/* Основной график */}
        <ResponsiveContainer width="100%" height={mainChartHeight} minHeight={280}>
          <BarChart
            data={groupedData}
            margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
            barCategoryGap="8%"
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={gridColor}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke={textSecondaryColor}
              tick={{ fill: textSecondaryColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              height={30}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={textSecondaryColor}
              tick={{ fill: textSecondaryColor, fontSize: 11 }}
              tickFormatter={(value) => {
                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                return value.toString()
              }}
              width={isMobile ? 40 : 50}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill={accentColor}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Простой контрол выбора диапазона */}
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={miniChartHeight} minHeight={50}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
            >
              <XAxis dataKey="date" hide />
              <Bar
                dataKey="count"
                fill={accentColor}
                opacity={0.25}
                radius={[2, 2, 0, 0]}
              />
              <Brush
                dataKey="date"
                height={miniChartHeight}
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
                onChange={handleBrushChange}
                tickFormatter={() => ''}
                fill={brushFillColor}
                stroke={brushStrokeColor}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-sm text-text-secondary mt-4 text-center">
        {startDate && formatDateLabel(startDate)} — {endDate && formatDateLabel(endDate)}
      </p>
    </div>
  )
}
