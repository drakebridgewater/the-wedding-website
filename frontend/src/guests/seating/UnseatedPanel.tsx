import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Armchair, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { GuestChip } from './GuestChip'
import type { SeatingGuest } from '../types'
import type { DragData, DropTarget, PartyGroup } from './dnd'

function UnseatedPartyGroup({
  group, collapsed, onToggle, onOpenGuest, onSeat, onSeatParty,
}: {
  group: PartyGroup
  collapsed: boolean
  onToggle: () => void
  onOpenGuest?: (partyId: number, guestId: number) => void
  onSeat?: (guest: SeatingGuest) => void
  onSeatParty?: (group: PartyGroup) => void
}) {
  const isSingleSolo = group.partyId === null && group.guests.length === 1
  const totalSeats = group.guests.length + group.plusOneCount

  // Party-level drag (only for multi-guest parties)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `party-${group.key}`,
    disabled: isSingleSolo,
    data: {
      type: 'party',
      partyId: group.partyId ?? -1,
      guestIds: group.guests.map((g) => g.id),
      partyName: group.partyName,
      plusOneCount: group.plusOneCount,
    } as DragData,
  })

  if (isSingleSolo) return <GuestChip guest={group.guests[0]} onOpenGuest={onOpenGuest} onSeat={onSeat} />

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={`rounded-lg border border-stone-200 bg-white transition-opacity ${isDragging ? 'opacity-30' : ''}`}
    >
      <div className="flex items-center gap-1 px-1.5 py-1">
        {/* Party drag handle */}
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-stone-300 hover:text-stone-400 p-1.5 flex-shrink-0"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          title="Drag to move whole party"
        >
          <GripVertical size={12} />
        </button>
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 flex-1 min-w-0 text-left py-1"
        >
          {collapsed
            ? <ChevronRight size={11} className="text-stone-400 flex-shrink-0" />
            : <ChevronDown size={11} className="text-stone-400 flex-shrink-0" />}
          <span className="text-xs font-medium text-stone-700 truncate">{group.partyName}</span>
          <span className="ml-auto text-[10px] text-stone-400 flex-shrink-0 pl-1">
            ({totalSeats}{group.plusOneCount > 0 && <span className="text-amber-500"> incl. +{group.plusOneCount}</span>})
          </span>
        </button>
        {onSeatParty && (
          <button
            onClick={(e) => { e.stopPropagation(); onSeatParty(group) }}
            title="Seat whole party at a table…"
            aria-label={`Seat ${group.partyName} at a table`}
            className="p-1.5 rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0"
          >
            <Armchair size={13} />
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="px-2 pb-2 flex flex-col gap-1 border-t border-stone-100 pt-1.5">
          {group.guests.map((g) => <GuestChip key={g.id} guest={g} onOpenGuest={onOpenGuest} onSeat={onSeat} />)}
          {group.plusOneCount > 0 && Array.from({ length: group.plusOneCount }).map((_, i) => (
            <div key={`plusone-${i}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-amber-200 bg-amber-50/50 text-xs text-amber-600 select-none">
              <GripVertical size={10} className="text-amber-300 flex-shrink-0" />
              <span className="italic">+1 (unnamed)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Drop zone + list of guests not yet assigned to a table. */
export function UnseatedPanel({
  groups, totalCount, collapsedParties, onToggleParty, onOpenGuest, onSeat, onSeatParty,
}: {
  groups: PartyGroup[]
  totalCount: number
  collapsedParties: Set<string>
  onToggleParty: (key: string) => void
  onOpenGuest?: (partyId: number, guestId: number) => void
  onSeat?: (guest: SeatingGuest) => void
  onSeatParty?: (group: PartyGroup) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unseated',
    data: { type: 'unseated' } as DropTarget,
  })

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
        Unseated ({totalCount})
      </h3>
      <div
        ref={setNodeRef}
        className={`min-h-28 rounded-xl border-2 border-dashed p-2 space-y-1.5 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50/50' : 'border-stone-200 bg-stone-50/50'
        }`}
      >
        {groups.length === 0 ? (
          <p className="text-center text-xs text-stone-300 py-6">All guests seated!</p>
        ) : (
          groups.map((group) => (
            <UnseatedPartyGroup
              key={group.key}
              group={group}
              collapsed={collapsedParties.has(group.key)}
              onToggle={() => onToggleParty(group.key)}
              onOpenGuest={onOpenGuest}
              onSeat={onSeat}
              onSeatParty={onSeatParty}
            />
          ))
        )}
      </div>
    </div>
  )
}
