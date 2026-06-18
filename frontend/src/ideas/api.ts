import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Idea, IdeaFilters, IdeaTag } from './types'

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
    throw new Error(body?.error ?? body?.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

/** POST multipart/form-data — let the browser set the Content-Type boundary. */
async function apiUpload<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrf() },
    credentials: 'same-origin',
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? body?.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

function ideasQueryString(filters: IdeaFilters): string {
  const params = new URLSearchParams()
  if (filters.tag) params.set('tag', String(filters.tag))
  if (filters.source) params.set('source', filters.source)
  if (filters.favorite) params.set('favorite', 'true')
  if (filters.q) params.set('q', filters.q)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useIdeas(filters: IdeaFilters) {
  return useQuery<Idea[]>({
    queryKey: ['ideas', filters],
    queryFn: () => apiFetch(`/ideas/api/ideas/${ideasQueryString(filters)}`),
  })
}

export function useUploadIdeas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (files: FileList | File[]) => {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append('images', f))
      return apiUpload<Idea[]>('/ideas/api/ideas/upload/', form)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

export function useCreateIdeaFromUrl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (url: string) =>
      apiFetch<Idea>('/ideas/api/ideas/fetch-url/', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

export function useUpdateIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Idea> & { id: number; tag_ids?: number[] }) =>
      apiFetch<Idea>(`/ideas/api/ideas/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

export function useDeleteIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/ideas/api/ideas/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

export function useTags() {
  return useQuery<IdeaTag[]>({
    queryKey: ['idea-tags'],
    queryFn: () => apiFetch('/ideas/api/tags/'),
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<IdeaTag>('/ideas/api/tags/', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['idea-tags'] }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/ideas/api/tags/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['idea-tags'] })
      qc.invalidateQueries({ queryKey: ['ideas'] })
    },
  })
}

export function usePinterestSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (boardId?: string) =>
      apiFetch<{ imported: number }>('/ideas/api/pinterest/sync/', {
        method: 'POST',
        body: JSON.stringify(boardId ? { board_id: boardId } : {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}
