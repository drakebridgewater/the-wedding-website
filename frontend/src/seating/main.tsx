import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../index.css'
import { SeatingChartApp } from './SeatingChartApp'

const queryClient = new QueryClient()

createRoot(document.getElementById('seating-root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SeatingChartApp />
    </QueryClientProvider>
  </StrictMode>,
)
