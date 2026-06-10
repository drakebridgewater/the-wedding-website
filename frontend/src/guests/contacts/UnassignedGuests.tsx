import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, UserPlus } from 'lucide-react'
import { useCreateParty, useDeleteGuest, useUnassignedGuests, useUpdateGuest } from '../api'
import type { Guest, Party } from '../types'
import { EMPTY_PARTY_FORM } from '../types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IconButton } from '../components/Button'
import { PartyPicker } from './PartyPicker'

/** Guests imported without a party — assign, spin off, or remove them. */
export function UnassignedGuests({
  parties, onOpenGuest,
}: {
  parties: Party[]
  onOpenGuest: (partyId: number, guestId?: number) => void
}) {
  const { data: unassigned = [], isLoading, isError } = useUnassignedGuests()
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()
  const createParty = useCreateParty()
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Guest | null>(null)
  const [search, setSearch] = useState('')

  const filtered = unassigned.filter((g) =>
    `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAssign(guestId: number, partyId: number) {
    try {
      await updateGuest.mutateAsync({ id: guestId, data: { party_id: partyId } })
      toast.success('Guest assigned')
      setAssigningId(null)
    } catch {
      toast.error('Failed to assign')
    }
  }

  async function handleNewParty(guest: Guest) {
    const partyName = `${guest.first_name} ${guest.last_name}`.trim()
    try {
      const party = await createParty.mutateAsync({ name: partyName, ...EMPTY_PARTY_FORM })
      await updateGuest.mutateAsync({ id: guest.id, data: { party_id: party.id } })
      toast.success(`Created party "${partyName}"`)
      onOpenGuest(party.id, guest.id)
    } catch {
      toast.error('Failed to create party')
    }
  }

  async function handleDelete(guest: Guest) {
    try { await deleteGuest.mutateAsync(guest.id) }
    catch { toast.error('Failed to delete') }
  }

  return (
    <div className="mt-6">
      {pendingDelete && (
        <ConfirmDialog
          title="Remove guest"
          message={`Remove ${pendingDelete.first_name} ${pendingDelete.last_name} from the guest list?`}
          confirmLabel="Remove"
          onConfirm={() => handleDelete(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-stone-700">Unassigned Guests</h3>
        {!isLoading && !isError && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            {unassigned.length}
          </span>
        )}
        <span className="text-xs text-stone-400">— imported without a party</span>
        {unassigned.length > 5 && (
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto border border-stone-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 w-40"
          />
        )}
      </div>
      {isLoading ? (
        <p className="text-xs text-stone-400 py-4">Loading…</p>
      ) : isError ? (
        <p className="text-xs text-red-500 py-4">Failed to load unassigned guests.</p>
      ) : unassigned.length === 0 ? null : (
        <div className="bg-white border border-amber-100 rounded-xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-4 text-xs text-stone-400 italic">No matches for "{search}"</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-amber-50/60 border-b border-amber-100">
                  <th className="text-left px-4 py-2.5 text-stone-500 font-medium">Name</th>
                  <th className="text-left px-3 py-2.5 text-stone-500 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-3 py-2.5 text-stone-500 font-medium">Assign to Party</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((guest) => (
                  <tr key={guest.id} className="hover:bg-stone-50/40">
                    <td className="px-4 py-2.5 text-stone-800 font-medium">
                      {guest.first_name} {guest.last_name}
                      {guest.is_child && (
                        <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-stone-400 hidden sm:table-cell">{guest.email || '—'}</td>
                    <td className="px-3 py-2.5">
                      {assigningId === guest.id ? (
                        <PartyPicker
                          parties={parties}
                          onSelect={(partyId) => handleAssign(guest.id, partyId)}
                          onNewParty={() => { setAssigningId(null); handleNewParty(guest) }}
                          onCancel={() => setAssigningId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setAssigningId(guest.id)}
                          className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors py-1.5"
                        >
                          <UserPlus size={12} /> Assign
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <IconButton title="Remove guest" danger onClick={() => setPendingDelete(guest)}>
                        <Trash2 size={12} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
