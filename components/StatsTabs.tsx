'use client'

import { useState } from 'react'
import TranslationDynamicsChart from './TranslationDynamicsChart'
import SitesStatsChart from './SitesStatsChart'
import ScanlatorsStats from './ScanlatorsStats'

type TabType = 'summary' | 'dynamics' | 'sites' | 'scanlators'

type StatsTabsProps = {
  summaryContent: React.ReactNode
  translationDynamics: Array<{
    date: string
    count: number
    year: number
    month: number
  }>
  sitesStats: Array<{
    id: string
    name: string
    count: number
  }>
  topScanlatorsByYear: {
    year: number
    topScanlators: Array<{
      siteId: string
      siteName: string
      count: number
    }>
  }
  mostTranslatedComic: {
    comicvine: number
    seriesName: string
    publisherName: string
    publisherId: number
    seriesId: number
    number: number
    thumb: string | null
    count: number
    year: number
  } | null
  topSitesByYear: {
    year: number
    topSites: Array<{
      siteId: string
      siteName: string
      count: number
    }>
  }
  freshmen: {
    year: number
    freshmen: Array<{
      siteId: string
      siteName: string
      firstDate: Date
      count: number
    }>
  }
}

export default function StatsTabs({
  summaryContent,
  translationDynamics,
  sitesStats,
  topScanlatorsByYear,
  mostTranslatedComic,
  topSitesByYear,
  freshmen,
}: StatsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary')

  return (
    <div>
      {/* Табы */}
      <div className="border-b border-border-secondary mb-6">
        <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
            }`}
          >
            Сводка
          </button>
          <button
            onClick={() => setActiveTab('dynamics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'dynamics'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
            }`}
          >
            Динамика переводов
          </button>
          <button
            onClick={() => setActiveTab('sites')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'sites'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
            }`}
          >
            По сайтам
          </button>
          <button
            onClick={() => setActiveTab('scanlators')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'scanlators'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
            }`}
          >
            По сканлейтерам
          </button>
        </nav>
      </div>

      {/* Контент табов */}
      <div>
        {activeTab === 'summary' && summaryContent}
        {activeTab === 'dynamics' && <TranslationDynamicsChart data={translationDynamics} />}
        {activeTab === 'sites' && <SitesStatsChart data={sitesStats} />}
        {activeTab === 'scanlators' && (
          <ScanlatorsStats
            topScanlatorsByYear={topScanlatorsByYear}
            mostTranslatedComic={mostTranslatedComic || null}
            topSitesByYear={topSitesByYear}
            freshmen={freshmen}
          />
        )}
      </div>
    </div>
  )
}

