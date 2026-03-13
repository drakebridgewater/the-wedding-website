import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GuestSeating, SeatingConfig, SeatingTable, TableFormData } from './types'

function getCsrf(): string {
  return (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? ''
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrf(),
      ...(options.headers as Record<string, string>),
    },
    credentials: 'same-origin',
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

const QK = {
  config: ['seating', 'config'] as const,
  tables: ['seating', 'tables'] as const,
  guests: ['seating', 'guests'] as const,
}

export function useSeatingConfig() {
  return useQuery<SeatingConfig>({
    queryKey: QK.config,
    queryFn: () => apiFetch('/planning/api/seating/config/'),
  })
}

export function useUpdateConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SeatingConfig>) =>
      apiFetch<SeatingConfig>('/planning/api/seating/config/', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => qc.setQueryData(QK.config, data),
  })
}

export function useTables() {
  return useQuery<SeatingTable[]>({
    queryKey: QK.tables,
    queryFn: () => apiFetch('/planning/api/seating/tables/'),
  })
}

export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TableFormData) =>
      apiFetch<SeatingTable>('/planning/api/seating/tables/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tables }),
  })
}

export function useUpdateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SeatingTable> }) =>
      apiFetch<SeatingTable>(`/planning/api/seating/tables/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: QK.tables })
      const prev = qc.getQueryData<SeatingTable[]>(QK.tables)
      qc.setQueryData(QK.tables, (old: SeatingTable[] = []) =>
        old.map((t) => (t.id === id ? { ...t, ...data } : t)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.tables, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.tables }),
  })
}

export function useDeleteTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/planning/api/seating/tables/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.tables })
      qc.invalidateQueries({ queryKey: QK.guests })
    },
  })
}

export function useGuests() {
  return useQuery<GuestSeating[]>({
    queryKey: QK.guests,
    queryFn: () => apiFetch('/planning/api/seating/guests/'),
  })
}

export function useAssignGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, tableId }: { guestId: number; tableId: number | null }) =>
      apiFetch<GuestSeating>(`/planning/api/seating/guests/${guestId}/assign/`, {
        method: 'PATCH',
        body: JSON.stringify({ table_id: tableId }),
      }),
    onMutate: async ({ guestId, tableId }) => {
      await qc.cancelQueries({ queryKey: QK.guests })
      await qc.cancelQueries({ queryKey: QK.tables })
      const prevGuests = qc.getQueryData<GuestSeating[]>(QK.guests)
      const prevTables = qc.getQueryData<SeatingTable[]>(QK.tables)
      qc.setQueryData(QK.guests, (old: GuestSeating[] = []) =>
        old.map((g) => (g.id === guestId ? { ...g, seating_table_id: tableId } : g)),
      )
      return { prevGuests, prevTables }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevGuests) qc.setQueryData(QK.guests, ctx.prevGuests)
      if (ctx?.prevTables) qc.setQueryData(QK.tables, ctx.prevTables)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.guests })
      qc.invalidateQueries({ queryKey: QK.tables })
    },
  })
}
