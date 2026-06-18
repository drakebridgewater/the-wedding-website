import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IdeasApp } from './IdeasApp'
import '@/index.css'

const el = document.getElementById('ideas-root')
const queryClient = new QueryClient()

if (el) {
  createRoot(el).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <IdeasApp />
      </QueryClientProvider>
    </StrictMode>,
  )
}
