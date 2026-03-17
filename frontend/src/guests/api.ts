import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Guest, GuestFormData, GroupFormData, MemberFormData,
  Party, PartyFormData, WeddingPartyGroup, WeddingPartyMember,
} from './types'

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
  members: ['guests', 'members'] as const,
  groups:  ['guests', 'groups']  as const,
  parties: ['guests', 'parties'] as const,
}

// ── Members ───────────────────────────────────────────────────────────────────

export function useMembers() {
  return useQuery<WeddingPartyMember[]>({
    queryKey: QK.members,
    queryFn: () => apiFetch('/guests/api/members/'),
  })
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MemberFormData) =>
      apiFetch<WeddingPartyMember>('/guests/api/members/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.members })
      qc.invalidateQueries({ queryKey: QK.groups })
    },
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MemberFormData> }) =>
      apiFetch<WeddingPartyMember>(`/guests/api/members/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.members })
      qc.invalidateQueries({ queryKey: QK.groups })
    },
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/members/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.members })
      qc.invalidateQueries({ queryKey: QK.groups })
    },
  })
}

// ── Groups ────────────────────────────────────────────────────────────────────

export function useGroups() {
  return useQuery<WeddingPartyGroup[]>({
    queryKey: QK.groups,
    queryFn: () => apiFetch('/guests/api/groups/'),
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GroupFormData) =>
      apiFetch<WeddingPartyGroup>('/guests/api/groups/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.groups }),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GroupFormData> }) =>
      apiFetch<WeddingPartyGroup>(`/guests/api/groups/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.groups }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/groups/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.groups }),
  })
}

// ── Parties ───────────────────────────────────────────────────────────────────

export function useParties() {
  return useQuery<Party[]>({
    queryKey: QK.parties,
    queryFn: () => apiFetch('/guests/api/parties/'),
  })
}

export function useCreateParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PartyFormData) =>
      apiFetch<Party>('/guests/api/parties/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.parties }),
  })
}

export function useUpdateParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PartyFormData> }) =>
      apiFetch<Party>(`/guests/api/parties/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.parties }),
  })
}

export function useDeleteParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/parties/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.parties }),
  })
}

// ── Guests ────────────────────────────────────────────────────────────────────

export function useAddGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partyId, data }: { partyId: number; data: GuestFormData }) =>
      apiFetch<Guest>(`/guests/api/parties/${partyId}/guests/`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.parties }),
  })
}

export function useUpdateGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Guest> }) =>
      apiFetch<Guest>(`/guests/api/guests/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.parties }),
  })
}

export function useDeleteGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/guests/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.parties }),
  })
}
