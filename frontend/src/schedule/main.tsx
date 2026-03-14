import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../index.css'
import { ScheduleApp } from './ScheduleApp'

const queryClient = new QueryClient()

createRoot(document.getElementById('schedule-root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ScheduleApp />
    </QueryClientProvider>
  </StrictMode>,
)
