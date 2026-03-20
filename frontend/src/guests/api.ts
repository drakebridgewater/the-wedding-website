import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  EmailTemplate, Guest, GuestFormData, GroupFormData, MemberFormData, MemberRole,
  Party, PartyFormData, SentEmail, WeddingPartyGroup, WeddingPartyMember,
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
  members:        ['guests', 'members']        as const,
  groups:         ['guests', 'groups']         as const,
  parties:        ['guests', 'parties']        as const,
  unassigned:     ['guests', 'unassigned']     as const,
  emailTemplates: ['guests', 'emailTemplates'] as const,
  sentEmails:     ['guests', 'sentEmails']     as const,
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

export function useUploadMemberPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const form = new FormData()
      form.append('image', file)
      return fetch(`/guests/api/members/${id}/photo/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf() },
        body: form,
      }).then((r) => r.json())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.members }),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<Guest> & { party_id?: number | null } }) =>
      apiFetch<Guest>(`/guests/api/guests/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.parties })
      qc.invalidateQueries({ queryKey: QK.unassigned })
    },
  })
}

export function useUnassignedGuests() {
  return useQuery<Guest[]>({
    queryKey: QK.unassigned,
    queryFn: () => apiFetch('/guests/api/guests/unassigned/'),
  })
}

export function useDeleteGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/guests/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.parties })
      qc.invalidateQueries({ queryKey: QK.unassigned })
    },
  })
}

// ── Guest role assignment ─────────────────────────────────────────────────────

export function useAssignGuestRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, role, color }: { guestId: number; role: MemberRole; color: string }) =>
      apiFetch<WeddingPartyMember>(`/guests/api/guests/${guestId}/assign_role/`, {
        method: 'POST',
        body: JSON.stringify({ role, color, order: 0 }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.members }),
  })
}

export function useRemoveGuestRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (guestId: number) =>
      apiFetch(`/guests/api/guests/${guestId}/remove_role/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.members }),
  })
}

// ── Email templates ───────────────────────────────────────────────────────────

export function useEmailTemplates() {
  return useQuery<EmailTemplate[]>({
    queryKey: QK.emailTemplates,
    queryFn: () => apiFetch('/guests/api/email-templates/'),
  })
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<EmailTemplate, 'name' | 'subject' | 'body_html'>) =>
      apiFetch<EmailTemplate>('/guests/api/email-templates/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.emailTemplates }),
  })
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'body_html'>> }) =>
      apiFetch<EmailTemplate>(`/guests/api/email-templates/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.emailTemplates }),
  })
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/email-templates/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.emailTemplates }),
  })
}

export function usePreviewEmailTemplate() {
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ subject: string; body_html: string }>(`/guests/api/email-templates/${id}/preview/`, { method: 'POST' }),
  })
}

export function useSendEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, partyIds }: { templateId: number; partyIds: number[] }) =>
      apiFetch<{ sent: number; errors: string[] }>(
        `/guests/api/email-templates/${templateId}/send/`,
        { method: 'POST', body: JSON.stringify({ party_ids: partyIds }) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sentEmails })
      qc.invalidateQueries({ queryKey: QK.parties })
    },
  })
}

// ── Sent emails log ───────────────────────────────────────────────────────────

export function useSentEmails(partyId?: number) {
  return useQuery<SentEmail[]>({
    queryKey: partyId ? [...QK.sentEmails, partyId] : QK.sentEmails,
    queryFn: () => apiFetch(partyId ? `/guests/api/sent-emails/?party=${partyId}` : '/guests/api/sent-emails/'),
  })
}
