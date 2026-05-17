import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AnyVendor, VendorType } from './types'

export interface ChecklistItem {
  id: number
  vendor_type: string
  category: string
  text: string
  question: string
  order: number
}

function getCsrf(): string {
  return (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? ''
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrf(),
      ...(options.headers as Record<string, string> | undefined),
    },
    credentials: 'same-origin',
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

async function apiUploadPhotos(url: string, files: File[]) {
  const form = new FormData()
  files.forEach((f) => form.append('images', f))
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrf() },
    credentials: 'same-origin',
    body: form,
  })
  if (!res.ok) throw new Error(`Upload error ${res.status}`)
  return res.json()
}

const qk = (vendorType: VendorType) => ['vendors', vendorType]

export function useVendors(vendorType: VendorType) {
  return useQuery<AnyVendor[]>({
    queryKey: qk(vendorType),
    queryFn: () => apiFetch(`/vendors/api/${vendorType}/`),
  })
}

export function useCreateVendor(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AnyVendor>) =>
      apiFetch<AnyVendor>(`/vendors/api/${vendorType}/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useUpdateVendor(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AnyVendor> }) =>
      apiFetch<AnyVendor>(`/vendors/api/${vendorType}/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: qk(vendorType) })
      const prev = qc.getQueryData<AnyVendor[]>(qk(vendorType))
      qc.setQueryData(qk(vendorType), (old: AnyVendor[] = []) =>
        old.map((v) => (v.id === id ? { ...v, ...data } : v)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk(vendorType), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useDeleteVendor(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/vendors/api/${vendorType}/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useUploadPhotos(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, files }: { id: number; files: File[] }) =>
      apiUploadPhotos(`/vendors/api/${vendorType}/${id}/photos/`, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useScrapePhotos(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, url }: { id: number; url?: string }) =>
      apiFetch<{ scraped: number }>(`/vendors/api/${vendorType}/${id}/scrape/`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useSetPrimaryPhoto(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoId: number) =>
      apiFetch(`/vendors/api/photos/${photoId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_primary: true }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useChecklistItems(vendorType: VendorType) {
  return useQuery<ChecklistItem[]>({
    queryKey: ['checklist-items', vendorType],
    queryFn: () =>
      fetch(`/vendors/api/checklist-items/?vendor_type=${vendorType}`).then((r) => r.json()),
    staleTime: Infinity,
  })
}

export function useDeletePhoto(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoId: number) =>
      apiFetch<void>(`/vendors/api/photos/${photoId}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

async function apiUploadDocument(url: string, file: File, name: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('name', name)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrf() },
    credentials: 'same-origin',
    body: form,
  })
  if (!res.ok) throw new Error(`Upload error ${res.status}`)
  return res.json()
}

export function useUploadDocument(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file, name }: { id: number; file: File; name: string }) =>
      apiUploadDocument(`/vendors/api/${vendorType}/${id}/documents/`, file, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useDeleteDocument(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: number) =>
      apiFetch<void>(`/vendors/api/documents/${docId}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}

export function useRenameDocument(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch(`/vendors/api/documents/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}
