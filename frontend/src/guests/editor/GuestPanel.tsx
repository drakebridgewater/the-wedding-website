import { useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useUpdateGuest, useUpdateMember } from '../api'
import type { Guest, WeddingPartyMember } from '../types'
import { MEAL_LABELS, ROLE_LABELS } from '../types'
import { BlurField } from '../components/BlurField'
import { CheckboxField } from '../components/FormField'
import { attendingLabel } from '../components/badges'

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
  const [confirmDelete, setConfirmDelete] = useState(false)

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
            {Object.entries(MEAL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
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

      {member && (
        <div className="mt-2 pt-4 border-t border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Wedding Party</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: member.color }}
              />
              {ROLE_LABELS[member.role] ?? member.role}
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
          </div>
          <p className="text-[10px] text-stone-400 mt-2">Manage role & color in the Wedding Party tab.</p>
        </div>
      )}

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
