import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface Note {
  id: number
  title: string
  content: string
  color: string
  created_at: string
  updated_at: string
}

export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange'

function getCsrf(): string {
  return (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? ''
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrf(),
      ...(options.headers ?? {}),
    },
    credentials: 'same-origin',
    ...options,
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

export function useNotes() {
  return useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: () => apiFetch('/notes/api/'),
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Note>) =>
      apiFetch<Note>('/notes/api/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Note> & { id: number }) =>
      apiFetch<Note>(`/notes/api/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/notes/api/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
