import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MusicApp } from './MusicApp'

const qc = new QueryClient()

const el = document.getElementById('music-root')
if (el) {
  createRoot(el).render(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <MusicApp />
      </QueryClientProvider>
    </StrictMode>,
  )
}
