'use client'

import ComicsListView from './ComicsListView'
import { ComicCardData } from './ComicCard'

type Comic = {
  id: number
  comicvine: number
  number: number
  pdate: Date | null
  date: Date | null
  thumb: string | null
  tiny: string | null
  site: string
  siteName: string | null
  siteId: string
  site2: string | null
  site2Name: string | null
  translate: string
  edit: string
  link: string | null
  series: {
    id: number
    name: string
    publisher: {
      id: number
      name: string
    }
  }
}

export default function SeriesComicsView({ comics }: { comics: Comic[] }) {
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
    <ComicsListView
      comics={comicsData}
      title="Выпуски"
      showCover={true}
      showTitle={true}
      titleMode="number-only"
      showPublisher={false}
      showSite={false}
      showDate={false}
      tableVariant="series"
      showTableOnMobile={false}
      groupByNumber={true}
      additionalTableData={comics.map(comic => ({
        id: comic.id,
        siteName: comic.siteName,
        siteId: comic.siteId,
        date: comic.date,
        link: comic.link,
        translate: comic.translate,
        edit: comic.edit,
        pdate: comic.pdate,
      }))}
    />
  )
}

