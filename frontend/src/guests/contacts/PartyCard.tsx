import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useAddGuest, type useUpdateParty } from '../api'
import type { Party, PartyFormData, WeddingPartyMember } from '../types'
import { PARTY_TYPE_LABELS, PARTY_TYPE_DESCRIPTIONS, PARTY_SIDE_LABELS } from '../types'
import { Badge } from '../components/badges'
import { StatusSelect } from '../components/StatusSelect'
import { TogglePill } from '../components/TogglePill'
import { IconButton } from '../components/Button'
import { GuestRow } from './GuestRow'
import { AddGuestRow } from './AddGuestRow'
import { visibleGuestsOf, type FilterMode } from './filters'

/** Expandable card for one party in the default "cards" view. */
export function PartyCard({
  party, expanded, onToggle, onEdit, onDelete,
  memberByGuestId, filterMode, searchQuery,
  onOpenGuest, updateParty,
}: {
  party: Party
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  memberByGuestId: Map<number, WeddingPartyMember>
  filterMode: FilterMode
  searchQuery: string
  onOpenGuest: (partyId: number, guestId: number) => void
  updateParty: ReturnType<typeof useUpdateParty>
}) {
  const addGuest = useAddGuest()
  const [showAddGuest, setShowAddGuest] = useState(false)

  function patch(data: Partial<PartyFormData>) {
    updateParty.mutateAsync({ id: party.id, data }).catch(() => toast.error('Failed to update'))
  }

  async function addPlusOne() {
    try {
      await addGuest.mutateAsync({
        partyId: party.id,
        data: { first_name: '+1', last_name: '', email: '', is_child: false, dietary_restrictions: '', label: '', is_plus_one: true },
      })
    } catch {
      toast.error('Failed to add +1')
    }
  }

  const visibleGuests = visibleGuestsOf(party, filterMode, searchQuery)
  const hiddenCount = party.guests.length - visibleGuests.length

  const attendingCount = party.guests.filter((g) => g.is_attending).length
  const totalCount = party.guests.length

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Party header row */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 flex-wrap">
        <button onClick={onToggle} className="flex items-center gap-2 basis-full sm:basis-0 sm:flex-1 min-w-0 text-left py-1">
          {expanded
            ? <ChevronDown size={15} className="text-stone-400 flex-shrink-0" />
            : <ChevronRight size={15} className="text-stone-400 flex-shrink-0" />}
          <span className="min-w-0">
            <span className="text-sm font-medium text-stone-800">{party.name}</span>
            <span className="text-xs text-stone-400 ml-2 whitespace-nowrap">
              {totalCount} guest{totalCount !== 1 ? 's' : ''}
              {attendingCount > 0 && <span className="text-emerald-500 ml-1">· {attendingCount} attending</span>}
            </span>
          </span>
        </button>
        {party.type && (
          <Badge title={PARTY_TYPE_DESCRIPTIONS[party.type]} className="cursor-help hidden sm:inline">
            {PARTY_TYPE_LABELS[party.type]}
          </Badge>
        )}
        {party.side && (
          <Badge tone="violet" className="hidden sm:inline">{PARTY_SIDE_LABELS[party.side]}</Badge>
        )}
        <TogglePill
          label="✉" tone="sky" active={party.wants_physical_card}
          titleOn="Wants physical card — click to remove" titleOff="No physical card — click to add"
          onToggle={() => patch({ wants_physical_card: !party.wants_physical_card })}
          className="hidden sm:inline-block"
        />
        {party.plus_one_allowed && (
          <Badge tone="amber" className="hidden sm:inline">+1 ok</Badge>
        )}
        <TogglePill
          label="RD" tone="emerald" active={party.rehearsal_dinner}
          titleOn="Invited to rehearsal dinner — click to remove" titleOff="Not invited to rehearsal dinner — click to add"
          onToggle={() => patch({ rehearsal_dinner: !party.rehearsal_dinner })}
        />
        <StatusSelect value={party.status} onChange={(s) => patch({ status: s })} />
        <div className="flex">
          <IconButton title="Edit party" onClick={onEdit}>
            <Pencil size={13} />
          </IconButton>
          <IconButton title="Delete party" danger onClick={onDelete}>
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>

      {/* Expanded guest rows */}
      {expanded && (
        <div className="border-t border-stone-50">
          {visibleGuests.length === 0 && !showAddGuest ? (
            <div className="px-4 sm:px-10 py-3 text-xs text-stone-400 italic">
              {hiddenCount > 0 ? `${hiddenCount} guest${hiddenCount !== 1 ? 's' : ''} hidden by filter` : 'No guests yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-50 bg-stone-50/60">
                    <th className="text-left px-4 sm:px-10 py-2 text-stone-400 font-medium">Name</th>
                    <th className="text-left px-2 py-2 text-stone-400 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left px-2 py-2 text-stone-400 font-medium">Attending</th>
                    <th className="text-left px-2 py-2 text-stone-400 font-medium hidden sm:table-cell">Meal</th>
                    <th className="text-left px-2 py-2 text-stone-400 font-medium hidden md:table-cell">Dietary</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibleGuests.map((g) => (
                    <GuestRow
                      key={g.id}
                      guest={g}
                      party={party}
                      member={memberByGuestId.get(g.id)}
                      onOpenGuest={onOpenGuest}
                    />
                  ))}
                  {hiddenCount > 0 && visibleGuests.length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 sm:px-10 py-1.5 text-[10px] text-stone-400 italic border-t border-stone-50">
                        {hiddenCount} guest{hiddenCount !== 1 ? 's' : ''} hidden by filter
                      </td>
                    </tr>
                  )}
                  {showAddGuest && (
                    <AddGuestRow
                      partyId={party.id}
                      addGuest={addGuest}
                      onDone={() => setShowAddGuest(false)}
                    />
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 sm:px-10 py-1.5 border-t border-stone-50 flex gap-4">
            <button
              onClick={() => setShowAddGuest(true)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors py-1.5"
            >
              <UserPlus size={12} /> Add guest
            </button>
            {party.plus_one_allowed && (
              <button
                onClick={addPlusOne}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-600 transition-colors py-1.5"
              >
                <UserPlus size={12} /> Add +1
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
