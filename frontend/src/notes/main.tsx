import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotesApp } from './NotesApp'
import '@/index.css'

const el = document.getElementById('notes-root')!
const queryClient = new QueryClient()

createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <NotesApp />
    </QueryClientProvider>
  </StrictMode>,
)
