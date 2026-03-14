import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EventFormData, ScheduleDay, ScheduleEvent, WeddingPartyMember } from './types'

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
  members: ['schedule', 'members'] as const,
  days: ['schedule', 'days'] as const,
}

export function useMembers() {
  return useQuery<WeddingPartyMember[]>({
    queryKey: QK.members,
    queryFn: () => apiFetch('/planning/api/schedule/members/'),
  })
}

export function useDays() {
  return useQuery<ScheduleDay[]>({
    queryKey: QK.days,
    queryFn: () => apiFetch('/planning/api/schedule/days/'),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EventFormData) =>
      apiFetch<ScheduleEvent>(`/planning/api/schedule/days/${data.day}/events/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.days }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EventFormData> }) =>
      apiFetch<ScheduleEvent>(`/planning/api/schedule/events/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.days }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/planning/api/schedule/events/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.days }),
  })
}
