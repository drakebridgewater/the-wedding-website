import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { X, Plus, Bell, BellOff, Eye, EyeOff, Trash2, UserPlus } from 'lucide-react'
import {
  useParties, useUpdateParty, useUpdateGuest, useDeleteGuest,
  useAddGuest, useMembers, useUpdateMember,
} from './api'
import type {
  Guest, PartyType, PartySide, InviteStatus, WeddingPartyMember,
} from './types'
import {
  MEAL_LABELS, PARTY_TYPE_LABELS, PARTY_SIDE_LABELS, INVITE_STATUS_LABELS, ROLE_LABELS,
} from './types'

// ── Auto-save blur input ───────────────────────────────────────────────────────

function BlurField({
  label, value, onSave, type = 'text', placeholder, textarea,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<unknown>
  type?: string
  placeholder?: string
  textarea?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(value), [value])

  async function commit() {
    if (draft === value) return
    setSaving(true)
    try { await onSave(draft) }
    catch { toast.error('Failed to save'); setDraft(value) }
    finally { setSaving(false) }
  }

  const cls = `w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 ${saving ? 'opacity-60' : ''}`

  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          rows={2}
          className={cls + ' resize-none'}
        />
      ) : (
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  )
}

// ── Address field with Google Places autocomplete ─────────────────────────────

function AddressField({ value, onSave }: { value: string; onSave: (v: string) => Promise<unknown> }) {
  const ref = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    const key = document.querySelector<HTMLMetaElement>('meta[name="google-places-key"]')?.content
    if (!key || !ref.current) return
    function init() {
      if (!ref.current || !(window as any).google?.maps?.places) return
      const ac = new (window as any).google.maps.places.Autocomplete(ref.current, { types: ['address'] })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place.formatted_address) setDraft(place.formatted_address)
      })
    }
    if ((window as any).google?.maps?.places) { init() }
    else {
      ;(window as any).__gplacesReady = init
      const scriptId = '__gplaces_loader__'
      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script')
        s.id = scriptId
        s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__gplacesReady`
        s.async = true
        document.head.appendChild(s)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function commit() {
    if (draft === value) return
    setSaving(true)
    try { await onSave(draft) }
    catch { toast.error('Failed to save'); setDraft(value) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">Address</label>
      <input
        ref={ref}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder="123 Main St…"
        className={`w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 ${saving ? 'opacity-60' : ''}`}
      />
    </div>
  )
}

// ── Guest panel ───────────────────────────────────────────────────────────────

function GuestPanel({
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
      {/* Name */}
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

      {/* Email */}
      <BlurField
        label="Email"
        value={guest.email ?? ''}
        onSave={(v) => save({ email: v })}
        type="email"
      />

      {/* Label */}
      <BlurField
        label="Label / Role"
        value={guest.label ?? ''}
        onSave={(v) => save({ label: v })}
        placeholder="Photographer, DJ, Officiant…"
      />

      {/* Dietary */}
      <BlurField
        label="Dietary restrictions"
        value={guest.dietary_restrictions ?? ''}
        onSave={(v) => save({ dietary_restrictions: v })}
        placeholder="Gluten-free, vegan, nut allergy…"
      />

      {/* Attending + Meal */}
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
            {guest.is_attending === true ? 'Yes' : guest.is_attending === false ? 'No' : 'Pending'}
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

      {/* Checkboxes */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={guest.is_child}
            onChange={(e) => save({ is_child: e.target.checked }).catch(() => toast.error('Failed'))}
            className="w-4 h-4 rounded border-stone-300"
          />
          Child
        </label>
        {guest.is_plus_one && (
          <span className="flex items-center text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">+1 guest</span>
        )}
      </div>

      {/* Wedding party section */}
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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

      {/* Delete */}
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
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 size={12} /> Remove from guest list
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main PartyEditor component ────────────────────────────────────────────────

export function PartyEditor({
  partyId, initialGuestId, onClose,
}: {
  partyId: number | null
  initialGuestId?: number
  onClose: () => void
}) {
  const { data: parties = [] } = useParties()
  const { data: members = [] } = useMembers()
  const updateParty = useUpdateParty()
  const addGuest = useAddGuest()
  const deleteGuest = useDeleteGuest()

  const party = partyId != null ? parties.find((p) => p.id === partyId) ?? null : null

  const memberByGuestId = new Map(
    members.filter((m) => m.guest_id != null).map((m) => [m.guest_id!, m])
  )

  // Active guest tab — default to initialGuestId, else first guest
  const [activeGuestId, setActiveGuestId] = useState<number | null>(null)

  useEffect(() => {
    if (!party) return
    if (initialGuestId != null && party.guests.some((g) => g.id === initialGuestId)) {
      setActiveGuestId(initialGuestId)
    } else if (party.guests.length > 0) {
      setActiveGuestId(party.guests[0].id)
    } else {
      setActiveGuestId(null)
    }
  }, [partyId, initialGuestId]) // only reset when partyId / initialGuestId changes

  // Dismiss on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleAddGuest() {
    if (!party) return
    try {
      const g = await addGuest.mutateAsync({
        partyId: party.id,
        data: { first_name: 'New', last_name: '', email: '', is_child: false, dietary_restrictions: '', label: '' },
      })
      setActiveGuestId(g.id)
    } catch {
      toast.error('Failed to add guest')
    }
  }

  async function handleDeleteGuest(guestId: number) {
    const guests = party?.guests ?? []
    const idx = guests.findIndex((g) => g.id === guestId)
    try {
      await deleteGuest.mutateAsync(guestId)
      // Move to adjacent guest
      const remaining = guests.filter((g) => g.id !== guestId)
      const next = remaining[Math.min(idx, remaining.length - 1)]
      setActiveGuestId(next?.id ?? null)
    } catch {
      toast.error('Failed to delete guest')
    }
  }

  function patchParty(data: Parameters<typeof updateParty.mutateAsync>[0]['data']) {
    if (!party) return Promise.resolve()
    return updateParty.mutateAsync({ id: party.id, data }).catch(() => { toast.error('Failed to save') })
  }

  const activeGuest = party?.guests.find((g) => g.id === activeGuestId) ?? null

  if (!party) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-lg bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-stone-900 truncate">{party.name}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 flex-shrink-0 ml-2">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Party fields ── */}
          <div className="px-5 py-4 border-b border-stone-100">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Party</p>
            <div className="space-y-3">
              <BlurField label="Party name *" value={party.name} onSave={(v) => patchParty({ name: v || party.name })} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
                  <select
                    value={party.status}
                    onChange={(e) => patchParty({ status: e.target.value as InviteStatus })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    {Object.entries(INVITE_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Type</label>
                  <select
                    value={party.type}
                    onChange={(e) => patchParty({ type: e.target.value as PartyType })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    {Object.entries(PARTY_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Side</label>
                  <select
                    value={party.side}
                    onChange={(e) => patchParty({ side: e.target.value as PartySide })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    {Object.entries(PARTY_SIDE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <BlurField label="Category" value={party.category ?? ''} onSave={(v) => patchParty({ category: v })} />
              </div>

              <AddressField value={party.address ?? ''} onSave={(v) => patchParty({ address: v })} />

              <BlurField label="Notes" value={party.comments ?? ''} onSave={(v) => patchParty({ comments: v })} textarea placeholder="Internal notes…" />

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={party.rehearsal_dinner}
                    onChange={(e) => patchParty({ rehearsal_dinner: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  Rehearsal dinner
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={party.wants_physical_card}
                    onChange={(e) => patchParty({ wants_physical_card: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  Physical card
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={party.plus_one_allowed}
                    onChange={(e) => patchParty({ plus_one_allowed: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  Plus one allowed
                </label>
              </div>
            </div>
          </div>

          {/* ── Guest tabs ── */}
          <div className="flex-1">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Guests</p>
              <button
                onClick={handleAddGuest}
                disabled={addGuest.isPending}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50"
              >
                <UserPlus size={12} /> Add person
              </button>
            </div>

            {party.guests.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-stone-400 mb-3">No guests yet.</p>
                <button
                  onClick={handleAddGuest}
                  className="flex items-center gap-1.5 mx-auto text-sm text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-4 py-2 transition-colors"
                >
                  <Plus size={14} /> Add first person
                </button>
              </div>
            ) : (
              <>
                {/* Tab strip */}
                <div className="flex gap-0 border-b border-stone-100 px-5 overflow-x-auto flex-shrink-0">
                  {party.guests.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGuestId(g.id)}
                      className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                        g.id === activeGuestId
                          ? 'border-stone-800 text-stone-900'
                          : 'border-transparent text-stone-400 hover:text-stone-700'
                      }`}
                    >
                      {g.first_name || '+1'}
                      {g.is_plus_one && (
                        <span className="ml-1 text-[9px] text-amber-600">+1</span>
                      )}
                      {memberByGuestId.has(g.id) && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 relative -top-0.5" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Active guest form */}
                {activeGuest && (
                  <div className="px-5 py-4">
                    <GuestPanel
                      guest={activeGuest}
                      member={memberByGuestId.get(activeGuest.id)}
                      onDelete={() => handleDeleteGuest(activeGuest.id)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
