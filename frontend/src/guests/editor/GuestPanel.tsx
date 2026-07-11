import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, Camera, ChevronDown, ChevronUp, Eye, EyeOff, Trash2, X } from 'lucide-react'
import {
  useAssignGuestRole, useRemoveGuestRole, useUpdateGuest, useUpdateMember,
  useUploadMemberPhoto,
} from '../api'
import type { Guest, MemberRole, WeddingPartyMember } from '../types'
import { ROLE_LABELS, ROLE_ORDER } from '../types'
import { MealSelectOptions } from '../components/MealSelectOptions'
import { BlurField } from '../components/BlurField'
import { CheckboxField } from '../components/FormField'
import { attendingLabel } from '../components/badges'
import { ColorPicker } from '../wedding-party/ColorPicker'

/** Per-guest form inside the PartyEditor drawer; every field auto-saves. */
export function GuestPanel({
  guest, member, onDelete,
}: {
  guest: Guest
  member?: WeddingPartyMember
  onDelete: () => void
}) {
  const updateGuest = useUpdateGuest()
  const updateMember = useUpdateMember()
  const assignRole = useAssignGuestRole()
  const removeRole = useRemoveGuestRole()
  const uploadPhoto = useUploadMemberPhoto()
  const photoRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  function save(data: Partial<Guest>) {
    return updateGuest.mutateAsync({ id: guest.id, data })
  }

  async function toggleAttending() {
    const next = guest.is_attending === null ? true : guest.is_attending === true ? false : null
    try { await save({ is_attending: next }) }
    catch { toast.error('Failed to update') }
  }

  async function toggleInformed() {
    if (!member) return
    try {
      await updateMember.mutateAsync({ id: member.id, data: { is_informed: !member.is_informed } })
      toast.success(member.is_informed ? 'Marked as not yet informed' : 'Marked as informed')
    } catch { toast.error('Failed to update') }
  }

  async function togglePublic() {
    if (!member) return
    try {
      await updateMember.mutateAsync({ id: member.id, data: { is_public: !member.is_public } })
      toast.success(member.is_public ? 'Removed from public page' : 'Added to public page')
    } catch { toast.error('Failed to update') }
  }

  async function setRole(role: MemberRole) {
    try {
      // Preserve the existing color when changing an existing member's role.
      await assignRole.mutateAsync({ guestId: guest.id, role, color: member?.color })
      toast.success(`Role set to ${ROLE_LABELS[role]}`)
    } catch { toast.error('Failed to set role') }
  }

  async function handleRemoveRole() {
    try {
      await removeRole.mutateAsync(guest.id)
      toast.success('Removed from wedding party')
    } catch { toast.error('Failed to remove role') }
  }

  async function setColor(color: string) {
    if (!member) return
    try { await updateMember.mutateAsync({ id: member.id, data: { color } }) }
    catch { toast.error('Failed to update color') }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !member) return
    try {
      await uploadPhoto.mutateAsync({ id: member.id, file })
      toast.success('Photo updated')
    } catch { toast.error('Failed to upload photo') }
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <BlurField
          label={guest.is_plus_one ? 'First name (optional)' : 'First name *'}
          value={guest.first_name}
          onSave={(v) => save({ first_name: v || (guest.is_plus_one ? '+1' : '') })}
        />
        <BlurField
          label="Last name"
          value={guest.last_name ?? ''}
          onSave={(v) => save({ last_name: v })}
        />
      </div>

      <BlurField
        label="Email"
        value={guest.email ?? ''}
        onSave={(v) => save({ email: v })}
        type="email"
      />

      <BlurField
        label="Label / Role"
        value={guest.label ?? ''}
        onSave={(v) => save({ label: v })}
        placeholder="Photographer, DJ, Officiant…"
      />

      <BlurField
        label="Dietary restrictions"
        value={guest.dietary_restrictions ?? ''}
        onSave={(v) => save({ dietary_restrictions: v })}
        placeholder="Gluten-free, vegan, nut allergy…"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Attending</label>
          <button
            onClick={toggleAttending}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              guest.is_attending === true  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' :
              guest.is_attending === false ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' :
                                            'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
            }`}
          >
            {attendingLabel(guest.is_attending)}
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Meal</label>
          <select
            value={guest.meal ?? ''}
            onChange={(e) => save({ meal: e.target.value as Guest['meal'] }).catch(() => toast.error('Failed'))}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <MealSelectOptions current={guest.meal ?? ''} />
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <CheckboxField
          label="Child"
          checked={guest.is_child}
          onChange={(e) => save({ is_child: e.target.checked }).catch(() => toast.error('Failed'))}
        />
        {guest.is_plus_one && (
          <span className="flex items-center text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">+1 guest</span>
        )}
      </div>

      <div className="mt-2 pt-4 border-t border-stone-100">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Wedding Party</p>
        {member ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: member.color }}
                />
                <select
                  value={member.role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  disabled={assignRole.isPending}
                  className="bg-transparent border-0 text-xs font-medium text-indigo-700 focus:outline-none cursor-pointer pr-1"
                >
                  {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </span>
              <button
                onClick={toggleInformed}
                title={member.is_informed ? 'Informed (click to undo)' : 'Not yet informed (click to mark informed)'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  member.is_informed
                    ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {member.is_informed ? <Bell size={11} /> : <BellOff size={11} />}
                {member.is_informed ? 'Informed' : 'Not informed'}
              </button>
              <button
                onClick={togglePublic}
                title={member.is_public ? 'Public page (click to hide)' : 'Hidden from public page (click to publish)'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  member.is_public
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {member.is_public ? <Eye size={11} /> : <EyeOff size={11} />}
                {member.is_public ? 'Public' : 'Not public'}
              </button>
              <button
                onClick={handleRemoveRole}
                disabled={removeRole.isPending}
                title="Remove from wedding party (keeps the guest)"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-stone-200 text-stone-400 hover:border-rose-300 hover:text-rose-500 transition-colors disabled:opacity-50"
              >
                <X size={11} /> Remove role
              </button>
            </div>

            {/* Photo + bio */}
            <div className="mt-4 flex items-start gap-3">
              <div className="relative group w-14 h-14 flex-shrink-0">
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name}
                    className="w-14 h-14 rounded-full object-cover border border-stone-200" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
                    <Camera size={18} className="text-stone-400" />
                  </div>
                )}
                <label
                  title="Change photo"
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/40 cursor-pointer transition-colors"
                >
                  <Camera size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <BlurField
                  label="Bio"
                  textarea
                  value={member.bio ?? ''}
                  onSave={(v) => updateMember.mutateAsync({ id: member.id, data: { bio: v } })}
                  placeholder="Short blurb for the public wedding party page…"
                />
              </div>
            </div>

            {/* Color */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-stone-500 mb-1">Color</label>
              <button
                onClick={() => setShowColorPicker((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <span className="w-3.5 h-3.5 rounded-full border border-stone-200" style={{ backgroundColor: member.color }} />
                <span className="font-mono">{member.color}</span>
                {showColorPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showColorPicker && (
                <div className="mt-2 max-w-xs">
                  <ColorPicker value={member.color} onChange={setColor} />
                </div>
              )}
            </div>
          </>
        ) : (
          <select
            value=""
            onChange={(e) => { if (e.target.value) setRole(e.target.value as MemberRole) }}
            disabled={assignRole.isPending}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
          >
            <option value="">Add wedding party role…</option>
            {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        )}
      </div>


      <div className="pt-2 border-t border-stone-100">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-600">Remove this guest?</span>
            <button
              onClick={onDelete}
              className="text-xs text-white bg-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-700"
            >Remove</button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-100"
            >Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-rose-500 transition-colors py-1.5"
          >
            <Trash2 size={12} /> Remove from guest list
          </button>
        )}
      </div>
    </div>
  )
}
