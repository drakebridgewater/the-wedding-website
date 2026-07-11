import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { useUpdateGuest, useDeleteGuest } from '../api'
import type { Guest, Party, WeddingPartyMember } from '../types'
import { MealSelectOptions } from '../components/MealSelectOptions'
import { InlineEditCell } from '../components/InlineEditCell'
import { AttendingBadge, GuestFlags } from '../components/badges'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IconButton } from '../components/Button'

/** One guest inside an expanded party card; fields edit inline. */
export function GuestRow({
  guest, party, member, onOpenGuest,
}: {
  guest: Guest
  party: Party
  member?: WeddingPartyMember
  onOpenGuest: (partyId: number, guestId: number) => void
}) {
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function toggleAttending() {
    const next = guest.is_attending === null ? true : guest.is_attending === true ? false : null
    try { await updateGuest.mutateAsync({ id: guest.id, data: { is_attending: next } }) }
    catch { toast.error('Failed to update') }
  }

  async function handleDelete() {
    try { await deleteGuest.mutateAsync(guest.id) }
    catch { toast.error('Failed to delete') }
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Remove guest"
          message={`Remove ${guest.first_name} ${guest.last_name} from the guest list?`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      <tr className="border-b border-stone-50 last:border-0 hover:bg-stone-50/40">
        <td className="px-4 sm:px-10 py-2 text-stone-700">
          <div className="flex items-center gap-1.5 flex-wrap">
            <InlineEditCell value={guest.first_name}
              onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { first_name: v } })} />
            {' '}
            <InlineEditCell value={guest.last_name ?? ''}
              onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { last_name: v } })} />
            <GuestFlags guest={guest} member={member} />
            {guest.label && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenGuest(party.id, guest.id) }}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium hover:bg-stone-200 transition-colors cursor-pointer"
                title="Click to edit"
              >
                {guest.label}
              </button>
            )}
          </div>
        </td>
        <td className="px-2 py-2 text-stone-400 hidden sm:table-cell">
          <InlineEditCell value={guest.email ?? ''} type="email"
            onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { email: v } })} />
        </td>
        <td className="px-2 py-2">
          <AttendingBadge value={guest.is_attending} onClick={toggleAttending} />
        </td>
        <td className="px-2 py-2 hidden sm:table-cell">
          <select
            value={guest.meal ?? ''}
            onChange={(e) =>
              updateGuest.mutateAsync({ id: guest.id, data: { meal: e.target.value as Guest['meal'] } })
                .catch(() => toast.error('Failed to update'))
            }
            className="text-[11px] border-0 bg-transparent text-stone-500 focus:outline-none cursor-pointer"
          >
            <MealSelectOptions current={guest.meal ?? ''} />
          </select>
        </td>
        <td className="px-2 py-2 hidden md:table-cell text-stone-400 text-[11px] max-w-[140px]">
          <InlineEditCell value={guest.dietary_restrictions ?? ''}
            onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { dietary_restrictions: v } })} />
        </td>
        <td className="px-2 py-1">
          <div className="flex">
            <IconButton title="Open full editor" onClick={() => onOpenGuest(party.id, guest.id)}>
              <Pencil size={12} />
            </IconButton>
            <IconButton title="Remove guest" danger onClick={() => setConfirmDelete(true)}>
              <Trash2 size={12} />
            </IconButton>
          </div>
        </td>
      </tr>
    </>
  )
}
