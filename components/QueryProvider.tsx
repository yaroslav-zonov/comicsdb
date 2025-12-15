'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Кэшируем данные на 5 минут
            staleTime: 1000 * 60 * 5,
            // Сохраняем кэш на 10 минут
            gcTime: 1000 * 60 * 10,
            // Повторная попытка при ошибке
            retry: 1,
            // Не обновлять автоматически при фокусе окна (для экономии запросов)
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
