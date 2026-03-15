import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateTaskData, TickTickTask, TodoFilters } from './types'

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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `API error ${res.status}`)
  }
  return res.json()
}

export function useTodos(filters: TodoFilters) {
  const params = new URLSearchParams({
    status: filters.status,
    sort: filters.sort,
    ...(filters.assignee ? { assignee: filters.assignee } : {}),
  })
  return useQuery<TickTickTask[]>({
    queryKey: ['todos', filters],
    queryFn: () => apiFetch(`/todos/api/?${params}`),
    staleTime: 30_000,  // treat fresh for 30s to avoid hammering TickTick
  })
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskData) =>
      apiFetch<TickTickTask>('/todos/api/create/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useCompleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      apiFetch<unknown>(`/todos/api/${taskId}/complete/`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
    // Optimistic: remove from the active list instantly
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['todos'] })
      const snapshot = qc.getQueriesData<TickTickTask[]>({ queryKey: ['todos'] })
      qc.setQueriesData<TickTickTask[]>({ queryKey: ['todos'] }, (old) =>
        old ? old.filter((t) => t.id !== taskId) : old
      )
      return { snapshot }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) {
          qc.setQueryData(key, data)
        }
      }
    },
  })
}
