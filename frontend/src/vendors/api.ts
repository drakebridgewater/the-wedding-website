import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AnyVendor, VendorType } from './types'

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

export function useDeletePhoto(vendorType: VendorType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoId: number) =>
      apiFetch<void>(`/vendors/api/photos/${photoId}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(vendorType) }),
  })
}
