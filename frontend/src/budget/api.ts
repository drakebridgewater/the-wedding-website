import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface Expense {
  id: number
  amount: string
  description: string
  paid_on: string | null
  notes: string | null
  created_at: string
}

export interface BudgetItem {
  id: number
  category: string
  category_display: string
  description: string
  estimated_cost: string
  actual_cost: string | null
  vendor_name: string | null
  notes: string | null
  is_paid: boolean
  variance: string | null
  expenses: Expense[]
  expense_total: string
  created_at: string
  updated_at: string
}

export interface BudgetSummary {
  total_estimated: string
  total_actual: string
  variance: string
  by_category: {
    category: string
    label: string
    estimated: number
    actual: number | null
  }[]
}

export type ItemFormData = Pick<
  BudgetItem,
  'category' | 'description' | 'estimated_cost' | 'vendor_name' | 'notes' | 'is_paid'
>

export interface ExpenseFormData {
  amount: string
  description: string
  paid_on?: string
  notes?: string
}

function getCsrf(): string {
  return (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? ''
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrf(),
      ...options.headers,
    },
    credentials: 'same-origin',
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export function useItems() {
  return useQuery<BudgetItem[]>({
    queryKey: ['budget-items'],
    queryFn: () => apiFetch('/budget/api/items/'),
  })
}

export function useSummary() {
  return useQuery<BudgetSummary>({
    queryKey: ['budget-summary'],
    queryFn: () => apiFetch('/budget/api/summary/'),
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['budget-items'] })
  qc.invalidateQueries({ queryKey: ['budget-summary'] })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ItemFormData) =>
      apiFetch<BudgetItem>('/budget/api/items/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ItemFormData> }) =>
      apiFetch<BudgetItem>(`/budget/api/items/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/budget/api/items/${id}/`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: ExpenseFormData }) =>
      apiFetch<BudgetItem>(`/budget/api/items/${itemId}/expenses/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (expenseId: number) =>
      apiFetch<BudgetItem>(`/budget/api/expenses/${expenseId}/`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateAll(qc),
  })
}

// ── Categories ────────────────────────────────────────────────────────────────

export interface BudgetCategory {
  slug: string
  label: string
  order: number
}

export function useCategories() {
  return useQuery<BudgetCategory[]>({
    queryKey: ['budget-categories'],
    queryFn: () => apiFetch('/budget/api/categories/'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { slug: string; label: string }) =>
      apiFetch<BudgetCategory>('/budget/api/categories/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-categories'] }),
  })
}
