import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EstimatorApp } from './EstimatorApp'
import '../index.css'

const queryClient = new QueryClient()

const root = document.getElementById('estimator-root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <EstimatorApp />
      </QueryClientProvider>
    </StrictMode>,
  )
}
