import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GuestsApp } from './GuestsApp'
import '@/index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('guests-root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GuestsApp />
    </QueryClientProvider>
  </StrictMode>
)
