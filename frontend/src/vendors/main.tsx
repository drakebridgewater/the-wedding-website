import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'leaflet/dist/leaflet.css'
import '../index.css'
import { VendorsApp } from './VendorsApp'
import type { VendorType } from './types'

const queryClient = new QueryClient()

const el = document.getElementById('vendors-root')!
const vendorType = (el.dataset.vendorType ?? 'venue') as VendorType

createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <VendorsApp vendorType={vendorType} />
    </QueryClientProvider>
  </StrictMode>,
)
