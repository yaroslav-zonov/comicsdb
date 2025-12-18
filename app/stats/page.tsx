import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StatsTabs from '@/components/StatsTabs'
import { prisma } from '@/lib/prisma'
import {
  getTranslationDynamics,
  getSitesStats,
  getTopScanlatorsByYear,
  getMostTranslatedComicByYear,
  getTopSitesByYear,
  getFreshmenByYear,
  getTopScanlatorsAllTime,
} from './getStatsData'

export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const [
      totalComics,
      totalSeries,
      totalPublishers,
      totalSites,
      recentComics,
    ] = await Promise.all([
      prisma.comic.count({
        where: { dateDelete: null },
      }),
      prisma.series.count({
        where: { dateDelete: null },
      }),
      prisma.publisher.count({
        where: { dateDelete: null },
      }),
      prisma.site.count({
        where: { dateDelete: null, hidesite: false },
      }),
      prisma.comic.count({
        where: {
          dateDelete: null,
          adddate: {
            gte: sevenDaysAgo,
          },
        },
      }),
    ])

    return {
      totalComics,
      totalSeries,
      totalPublishers,
      totalSites,
      recentComics,
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      totalComics: 0,
      totalSeries: 0,
      totalPublishers: 0,
      totalSites: 0,
      recentComics: 0,
    }
  }
}

export default async function StatsPage() {
  const [
    stats,
    translationDynamics,
    sitesStats,
    topScanlatorsByYear,
    mostTranslatedComic,
    topSitesByYear,
    freshmen,
    topScanlatorsAllTime,
  ] = await Promise.all([
    getStats(),
    getTranslationDynamics(),
    getSitesStats(),
    getTopScanlatorsByYear(),
    getMostTranslatedComicByYear(),
    getTopSitesByYear(),
    getFreshmenByYear(),
    getTopScanlatorsAllTime(),
  ])

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Хлебные крошки */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center space-x-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">Статистика</li>
            </ol>
          </nav>

          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-text-primary mb-8">Статистика</h1>

          {/* Табы */}
          <StatsTabs
            summaryContent={
              <>
                {/* Статистика */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-bg-card rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-accent mb-2">
                      {stats.totalComics.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {stats.totalComics === 1 ? 'комикс' : stats.totalComics < 5 ? 'комикса' : 'комиксов'} в базе
                    </div>
                  </div>

                  <div className="bg-bg-card rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-accent mb-2">
                      {stats.totalSeries.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {stats.totalSeries === 1 ? 'серия' : stats.totalSeries < 5 ? 'серии' : 'серий'}
                    </div>
                  </div>

                  <div className="bg-bg-card rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-accent mb-2">
                      {stats.totalPublishers.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {stats.totalPublishers === 1 ? 'издательство' : stats.totalPublishers < 5 ? 'издательства' : 'издательств'}
                    </div>
                  </div>

                  <div className="bg-bg-card rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-accent mb-2">
                      {stats.totalSites.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {stats.totalSites === 1 ? 'сайт переводчиков' : stats.totalSites < 5 ? 'сайта переводчиков' : 'сайтов переводчиков'}
                    </div>
                  </div>

                  <div className="bg-bg-card rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-accent mb-2">
                      {stats.recentComics.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-sm text-text-secondary">
                      новых переводов за последние 7 дней
                    </div>
                  </div>
                </div>

                {/* Дополнительная информация */}
                <div className="bg-bg-card rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-text-primary mb-4">О базе данных</h2>
                  <p className="text-text-secondary mb-4">
                    ComicsDB содержит информацию о русских переводах комиксов различных издательств, 
                    включая Marvel, DC Comics, Image и другие. База данных постоянно пополняется новыми переводами.
                  </p>
                  <p className="text-text-secondary">
                    Данные о комиксах берутся из API Comicvine, информация о переводах добавляется 
                    администраторами проекта.
                  </p>
                </div>
              </>
            }
            translationDynamics={translationDynamics}
            sitesStats={sitesStats}
            topScanlatorsByYear={topScanlatorsByYear}
            mostTranslatedComic={mostTranslatedComic}
            topSitesByYear={topSitesByYear}
            freshmen={freshmen}
            topScanlatorsAllTime={topScanlatorsAllTime}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}

