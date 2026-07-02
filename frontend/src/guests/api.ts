import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  EmailPreview, EmailTemplate, EmailTemplateDraft, EmailTemplateFormData, Guest, GuestFormData, MemberFormData, MemberRole,
  Party, PartyFormData, SentEmail,
  SeatingGuest, SeatingTable, TableFormData,
  WeddingPartyMember,
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
  parties:        ['guests', 'parties']        as const,
  unassigned:     ['guests', 'unassigned']     as const,
  emailTemplates: ['guests', 'emailTemplates'] as const,
  sentEmails:     ['guests', 'sentEmails']     as const,
  seatingTables:  ['seating', 'tables']        as const,
  seatingGuests:  ['seating', 'guests']        as const,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.members }),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MemberFormData> }) =>
      apiFetch<WeddingPartyMember>(`/guests/api/members/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.members }),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/members/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.members }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.parties })
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
    },
  })
}

export function useUpdateParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PartyFormData> }) =>
      apiFetch<Party>(`/guests/api/parties/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.parties })
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
    },
  })
}

export function useDeleteParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/api/parties/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.parties })
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
    },
  })
}

// ── Guests ────────────────────────────────────────────────────────────────────

export function useAddGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partyId, data }: { partyId: number; data: GuestFormData }) =>
      apiFetch<Guest>(`/guests/api/parties/${partyId}/guests/`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.parties })
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
    },
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
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
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
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
    },
  })
}

// ── Guest role assignment ─────────────────────────────────────────────────────

export function useAssignGuestRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, role, color }: { guestId: number; role: MemberRole; color?: string }) =>
      apiFetch<WeddingPartyMember>(`/guests/api/guests/${guestId}/assign_role/`, {
        method: 'POST',
        body: JSON.stringify({ role, color: color ?? '#94a3b8', order: 0 }),
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
    mutationFn: (data: EmailTemplateFormData) =>
      apiFetch<EmailTemplate>('/guests/api/email-templates/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.emailTemplates }),
  })
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EmailTemplateFormData> }) =>
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
    mutationFn: ({ id, partyId, draft }: { id: number; partyId?: number; draft?: EmailTemplateDraft }) =>
      apiFetch<EmailPreview>(`/guests/api/email-templates/${id}/preview/`, {
        method: 'POST',
        body: JSON.stringify({ ...(draft ?? {}), ...(partyId ? { party_id: partyId } : {}) }),
      }),
  })
}

export function useTestSendEmailTemplate() {
  return useMutation({
    mutationFn: ({ id, email, partyId, draft }: { id: number; email: string; partyId?: number; draft?: EmailTemplateDraft }) =>
      apiFetch<{ sent_to: string }>(`/guests/api/email-templates/${id}/test-send/`, {
        method: 'POST',
        body: JSON.stringify({ ...(draft ?? {}), email, ...(partyId ? { party_id: partyId } : {}) }),
      }),
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

export function useUploadEmailTemplateImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const form = new FormData()
      form.append('image', file)
      return fetch(`/guests/api/email-templates/${id}/upload-image/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf() },
        body: form,
      }).then((r) => r.json() as Promise<EmailTemplate>)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.emailTemplates }),
  })
}

export function useRemoveEmailTemplateImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<EmailTemplate>(`/guests/api/email-templates/${id}/upload-image/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.emailTemplates }),
  })
}

// ── Sent emails log ───────────────────────────────────────────────────────────

export function useSentEmails(partyId?: number) {
  return useQuery<SentEmail[]>({
    queryKey: partyId ? [...QK.sentEmails, partyId] : QK.sentEmails,
    queryFn: () => apiFetch(partyId ? `/guests/api/sent-emails/?party=${partyId}` : '/guests/api/sent-emails/'),
  })
}

// ── Seating tables ────────────────────────────────────────────────────────────

export function useSeatingTables() {
  return useQuery<SeatingTable[]>({
    queryKey: QK.seatingTables,
    queryFn: () => apiFetch('/seating/api/tables/'),
  })
}

export function useCreateSeatingTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TableFormData) =>
      apiFetch<SeatingTable>('/seating/api/tables/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.seatingTables }),
  })
}

export function useUpdateSeatingTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TableFormData> }) =>
      apiFetch<SeatingTable>(`/seating/api/tables/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.seatingTables }),
  })
}

export function useDeleteSeatingTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/seating/api/tables/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.seatingTables })
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
    },
  })
}

// ── Seating guests ────────────────────────────────────────────────────────────

export function useSeatingGuests() {
  return useQuery<SeatingGuest[]>({
    queryKey: QK.seatingGuests,
    queryFn: () => apiFetch('/seating/api/guests/'),
  })
}

export function useAssignGuestToTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, tableId }: { guestId: number; tableId: number | null }) =>
      apiFetch<SeatingGuest>(`/seating/api/guests/${guestId}/assign/`, {
        method: 'PATCH',
        body: JSON.stringify({ table_id: tableId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
      qc.invalidateQueries({ queryKey: QK.seatingTables })
    },
  })
}

export function useBatchAssignGuests() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestIds, tableId }: { guestIds: number[]; tableId: number | null }) =>
      apiFetch<{ updated: number }>('/seating/api/guests/batch-assign/', {
        method: 'POST',
        body: JSON.stringify({ guest_ids: guestIds, table_id: tableId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.seatingGuests })
      qc.invalidateQueries({ queryKey: QK.seatingTables })
    },
  })
}
