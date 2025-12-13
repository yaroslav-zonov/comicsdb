import Header from '@/components/Header'
import NewSeries from '@/components/NewSeries'
import FreshReleasesServer from '@/components/FreshReleasesServer'
import Footer from '@/components/Footer'

// Кешируем главную страницу на 30 секунд для ускорения
export const revalidate = 30

export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      
      <main className="flex-1 bg-bg-primary">
        {/* Новые серии */}
        <NewSeries />
        
        {/* Свежие релизы */}
        <FreshReleasesServer />
      </main>

      <Footer />
    </div>
  )
}

