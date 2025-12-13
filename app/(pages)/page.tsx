import { Suspense } from 'react'
import Header from '@/components/Header'
import NewSeries from '@/components/NewSeries'
import FreshReleasesServer from '@/components/FreshReleasesServer'
import Footer from '@/components/Footer'

// Кешируем главную страницу на 30 секунд для ускорения
export const revalidate = 30

// Скелетон для загрузки
function SectionSkeleton() {
  return (
    <section className="py-12 bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-bg-tertiary rounded animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <main className="flex-1 bg-bg-primary">
        {/* Новые серии с Suspense для streaming */}
        <Suspense fallback={<SectionSkeleton />}>
          <NewSeries />
        </Suspense>
        
        {/* Свежие релизы с Suspense для streaming */}
        <Suspense fallback={<SectionSkeleton />}>
          <FreshReleasesServer />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}

