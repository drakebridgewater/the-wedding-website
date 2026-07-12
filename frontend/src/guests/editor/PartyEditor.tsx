import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, UserPlus, X } from 'lucide-react'
import {
  useAddGuest, useDeleteGuest, useMembers, useParties, useUpdateParty,
} from '../api'
import type { InviteStatus, PartySide, PartyType } from '../types'
import {
  INVITE_STATUS_LABELS, PARTY_SIDE_LABELS, PARTY_TYPE_LABELS,
} from '../types'
import { BlurField } from '../components/BlurField'
import { CheckboxField, SelectField } from '../components/FormField'
import { AddressField } from './AddressField'
import { GuestPanel } from './GuestPanel'

/**
 * Slide-over drawer for editing a party and its guests.
 * Full-screen on phones, right-hand panel from `sm:` up.
 */
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, initialGuestId]) // only reset when partyId / initialGuestId changes

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
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:max-w-lg bg-white shadow-2xl overflow-hidden h-dvh">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-stone-900 truncate">{party.name}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-600 flex-shrink-0 ml-2 p-1.5 -m-1.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {/* ── Party fields ── */}
          <div className="px-4 sm:px-5 py-4 border-b border-stone-100">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Party</p>
            <div className="space-y-3">
              <BlurField label="Party name *" value={party.name} onSave={(v) => patchParty({ name: v || party.name })} />

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Status"
                  value={party.status}
                  onChange={(e) => patchParty({ status: e.target.value as InviteStatus })}
                  options={Object.entries(INVITE_STATUS_LABELS)}
                />
                <SelectField
                  label="Type"
                  value={party.type}
                  onChange={(e) => patchParty({ type: e.target.value as PartyType })}
                  options={Object.entries(PARTY_TYPE_LABELS)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Side"
                  value={party.side}
                  onChange={(e) => patchParty({ side: e.target.value as PartySide })}
                  options={Object.entries(PARTY_SIDE_LABELS)}
                />
                <BlurField label="Category" value={party.category ?? ''} onSave={(v) => patchParty({ category: v })} />
              </div>

              <AddressField
                value={party.address ?? ''}
                verified={party.address_verified ?? false}
                onSave={(patch) => patchParty(patch)}
              />

              <BlurField label="Notes" value={party.comments ?? ''} onSave={(v) => patchParty({ comments: v })} textarea placeholder="Internal notes…" />

              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <CheckboxField
                  label="Rehearsal dinner"
                  checked={party.rehearsal_dinner}
                  onChange={(e) => patchParty({ rehearsal_dinner: e.target.checked })}
                />
                <CheckboxField
                  label="Physical card"
                  checked={party.wants_physical_card}
                  onChange={(e) => patchParty({ wants_physical_card: e.target.checked })}
                />
                <CheckboxField
                  label="Plus one allowed"
                  checked={party.plus_one_allowed}
                  onChange={(e) => patchParty({ plus_one_allowed: e.target.checked })}
                />
              </div>
            </div>
          </div>

          {/* ── Guest tabs ── */}
          <div className="flex-1">
            <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Guests</p>
              <button
                onClick={handleAddGuest}
                disabled={addGuest.isPending}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50 py-1.5"
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
                <div className="flex gap-0 border-b border-stone-100 px-4 sm:px-5 overflow-x-auto flex-shrink-0">
                  {party.guests.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGuestId(g.id)}
                      className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
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
                  <div className="px-4 sm:px-5 py-4">
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
