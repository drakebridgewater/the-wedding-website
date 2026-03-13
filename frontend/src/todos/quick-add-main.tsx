import { useState } from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Toaster } from 'sonner'
import { CreateTaskModal } from './CreateTaskModal'
import '@/index.css'

function QuickAddFAB() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Toaster position="top-right" />
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[1035] w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Add new task"
        title="Add wedding task"
      >
        <Plus size={24} />
      </button>
      <CreateTaskModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

const el = document.getElementById('quick-add-root')
if (el) {
  const queryClient = new QueryClient()
  createRoot(el).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <QuickAddFAB />
      </QueryClientProvider>
    </StrictMode>
  )
}
