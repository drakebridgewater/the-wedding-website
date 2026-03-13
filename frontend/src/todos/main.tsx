import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodosApp } from './TodosApp'
import '@/index.css'

const el = document.getElementById('todos-root')!
const drakeEmail = el.dataset.drakeEmail ?? ''
const shawnaEmail = el.dataset.shawnaEmail ?? ''

const queryClient = new QueryClient()

createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TodosApp drakeEmail={drakeEmail} shawnaEmail={shawnaEmail} />
    </QueryClientProvider>
  </StrictMode>
)
