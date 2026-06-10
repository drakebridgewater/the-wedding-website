import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'
import { useUploadMemberPhoto } from '../api'
import type { MemberFormData, MemberRole, WeddingPartyMember } from '../types'
import { ROLE_LABELS, ROLE_ORDER } from '../types'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { CheckboxField, Field, SelectField, TextAreaField, TextField } from '../components/FormField'
import { ColorPicker } from './ColorPicker'
import { useEnterSubmit } from '../hooks/useEnterSubmit'

export function MemberModal({
  initial, onSave, onClose, saving,
}: {
  initial?: WeddingPartyMember
  onSave: (data: MemberFormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<MemberFormData>({
    name:        initial?.name        ?? '',
    role:        initial?.role        ?? 'other',
    color:       initial?.color       ?? '#6366f1',
    email:       initial?.email       ?? '',
    phone:       initial?.phone       ?? '',
    bio:         initial?.bio         ?? '',
    order:       initial?.order       ?? 0,
    is_informed: initial?.is_informed ?? false,
    is_public:   initial?.is_public   ?? false,
  })
  const photoRef = useRef<HTMLInputElement>(null)
  const uploadPhoto = useUploadMemberPhoto()

  function set<K extends keyof MemberFormData>(k: K, v: MemberFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  useEnterSubmit(() => onSave(form), !form.name || saving)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !initial) return
    try {
      await uploadPhoto.mutateAsync({ id: initial.id, file })
      toast.success('Photo updated')
    } catch {
      toast.error('Failed to upload photo')
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Member' : 'Add Member'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!form.name || saving} onClick={() => form.name && onSave(form)}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add member'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Photo — only shown when editing an existing member */}
        {initial && (
          <div className="flex items-center gap-4">
            <div className="relative group w-16 h-16 flex-shrink-0">
              {initial.photo_url ? (
                <img src={initial.photo_url} alt={initial.name}
                  className="w-16 h-16 rounded-full object-cover border border-stone-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
                  <Camera size={20} className="text-stone-400" />
                </div>
              )}
              <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/40 cursor-pointer transition-colors">
                <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <input ref={photoRef} type="file" accept="image/*" className="hidden"
                  onChange={handlePhotoChange} />
              </label>
            </div>
            <p className="text-xs text-stone-400">Tap photo to change</p>
          </div>
        )}
        <TextField label="Name *" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        <SelectField
          label="Role *"
          value={form.role}
          onChange={(e) => set('role', e.target.value as MemberRole)}
          options={ROLE_ORDER.map((r) => [r, ROLE_LABELS[r]])}
        />
        <Field label="Color">
          <ColorPicker value={form.color} onChange={(c) => set('color', c)} />
        </Field>
        <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <TextField label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <TextAreaField
          label="Bio"
          value={form.bio}
          onChange={(e) => set('bio', e.target.value)}
          rows={3}
          placeholder="A short description shown on the wedding party page…"
        />
        <CheckboxField
          label="Informed"
          hint="(person has been told about their role)"
          checked={form.is_informed}
          onChange={(e) => set('is_informed', e.target.checked)}
        />
        <CheckboxField
          label="Public"
          hint="(visible on the public wedding party page)"
          checked={form.is_public}
          onChange={(e) => set('is_public', e.target.checked)}
        />
      </div>
    </Modal>
  )
}
