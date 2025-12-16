'use client'

import ComicsListView from './ComicsListView'
import { ComicCardData } from './ComicCard'

type Comic = {
  id: number
  comicvine: number
  number: number
  pdate: Date | null
  date: Date | null
  series: {
    id: number
    name: string
    publisher: {
      id: number
      name: string
    }
  }
  thumb: string
  tiny: string
  translate: string
  site: string
  siteName: string | null
  siteId?: string
  site2?: string | null
  site2Name?: string | null
  site2Id?: string | null
  link: string
  isJoint?: boolean
}

export default function FreshReleases({ comics }: { comics: Comic[] }) {
  const comicsData: ComicCardData[] = comics.map(comic => ({
    id: comic.id,
    comicvine: comic.comicvine,
    number: comic.number,
    series: comic.series,
    thumb: comic.thumb,
    tiny: comic.tiny,
    siteName: comic.siteName,
    date: comic.date,
    pdate: comic.pdate,
  }))

  return (
    <section className="section-spacing bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ComicsListView
          comics={comicsData}
          title="Свежие релизы"
          showCover={true}
          showTitle={true}
          showPublisher={false}
          showSite={true}
          showDate={false}
          tableVariant="main"
          showTableOnMobile={false}
          groupByNumber={false}
          additionalTableData={comics.map(comic => ({
            id: comic.id,
            siteName: comic.siteName,
            siteId: comic.siteId || comic.site,
            site2Name: comic.site2Name,
            site2Id: comic.site2Id,
            link: comic.link,
            date: comic.date,
            pdate: comic.pdate,
            isJoint: comic.isJoint,
          }))}
        />
      </div>
    </section>
  )
}

