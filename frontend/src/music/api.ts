import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateSongData, FetchedMetadata, ListType, MusicBrainzResult, Song } from './types'

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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `API error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

const QK = {
  songs: (listType?: ListType) =>
    listType ? ['music', 'songs', listType] : ['music', 'songs'],
}

export function useSongs(listType?: ListType) {
  const params = listType ? `?list_type=${listType}` : ''
  return useQuery<Song[]>({
    queryKey: QK.songs(listType),
    queryFn: () => apiFetch(`/music/api/songs/${params}`),
  })
}

export function useCreateSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSongData) =>
      apiFetch<Song>('/music/api/songs/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'songs'] }),
  })
}

export function useUpdateSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSongData> }) =>
      apiFetch<Song>(`/music/api/songs/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'songs'] }),
  })
}

export function useDeleteSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/music/api/songs/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'songs'] }),
  })
}

export function useFetchUrl() {
  return useMutation({
    mutationFn: (url: string) =>
      apiFetch<FetchedMetadata>('/music/api/songs/fetch-url/', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
  })
}

export function useMusicBrainzSearch(q: string) {
  return useQuery<MusicBrainzResult[]>({
    queryKey: ['music', 'mb-search', q],
    queryFn: () => apiFetch(`/music/api/search/?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}
