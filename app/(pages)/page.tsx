import { Suspense } from 'react'
import Header from '@/components/Header'
import NewSeries from '@/components/NewSeries'
import FreshReleasesServer from '@/components/FreshReleasesServer'
import Footer from '@/components/Footer'
import SectionSkeleton from '@/components/skeletons/SectionSkeleton'

// Кешируем главную страницу на 30 секунд для ускорения
export const revalidate = 30

export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <main className="flex-1 bg-bg-primary">
        {/* Новые серии с Suspense для streaming - статичный заголовок, динамический контент */}
        <Suspense fallback={<SectionSkeleton title={true} gridCols="comics" count={5} />}>
          <NewSeries />
        </Suspense>
        
        {/* Свежие релизы с Suspense для streaming - статичный заголовок, динамический контент */}
        <Suspense fallback={<SectionSkeleton title={true} gridCols="comics" count={12} />}>
          <FreshReleasesServer />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}

