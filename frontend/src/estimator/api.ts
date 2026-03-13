import { useMutation } from '@tanstack/react-query'

export interface EstimateRequest {
  guest_count: number
  tier: 'budget' | 'standard' | 'luxury'
}

export interface EstimateResult {
  guest_count: number
  tier: string
  total: number
  breakdown: {
    category: string
    label: string
    amount: number
  }[]
}

function getCsrf(): string {
  return (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? ''
}

export function useEstimate() {
  return useMutation<EstimateResult, Error, EstimateRequest>({
    mutationFn: async (data) => {
      const res = await fetch('/planning/api/budget/estimate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrf(),
        },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Estimation failed')
      return res.json()
    },
  })
}

export interface ImportResult {
  created: number
  skipped: number
  skipped_categories: string[]
}

export function useImportEstimate() {
  return useMutation<ImportResult, Error, EstimateRequest>({
    mutationFn: async (data) => {
      const res = await fetch('/planning/api/budget/import-estimate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrf(),
        },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Import failed')
      return res.json()
    },
  })
}
