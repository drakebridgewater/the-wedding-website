import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Armchair, GripVertical } from 'lucide-react'
import type { SeatingGuest } from '../types'
import type { DragData } from './dnd'

/**
 * Draggable guest chip. The grip is the drag activator (not the whole chip)
 * so the surrounding lists stay scrollable on touch screens and tapping the
 * chip body opens the shared guest editor. The armchair button is the
 * tap-based alternative to dragging: it opens the table picker sheet.
 */
export function GuestChip({
  guest, onOpenGuest, onSeat,
}: {
  guest: SeatingGuest
  onOpenGuest?: (partyId: number, guestId: number) => void
  onSeat?: (guest: SeatingGuest) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: {
      type: 'guest',
      guestId: guest.id,
      currentTableId: guest.seating_table_id,
    } as DragData,
  })

  const canOpen = onOpenGuest && guest.party_id != null

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      onClick={canOpen ? () => onOpenGuest(guest.party_id!, guest.id) : undefined}
      title={canOpen ? 'Tap to edit guest' : undefined}
      className={`flex items-center gap-1 pr-2 py-0.5 rounded-md border border-stone-200 bg-white text-xs text-stone-700 select-none transition-opacity ${isDragging ? 'opacity-30' : 'hover:border-stone-300'} ${canOpen ? 'cursor-pointer' : ''}`}
    >
      <button
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        title="Drag to a table"
        className="cursor-grab active:cursor-grabbing touch-none p-1.5 text-stone-300 hover:text-stone-500 flex-shrink-0"
      >
        <GripVertical size={12} />
      </button>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          guest.is_attending === true ? 'bg-emerald-400' : 'bg-amber-300'
        }`}
        title={guest.is_attending === true ? 'Attending' : 'Pending RSVP'}
      />
      <span className="truncate flex-1">
        {guest.first_name} {guest.last_name}
        {guest.is_child && <span className="ml-1 text-stone-400 text-[10px]">child</span>}
        {guest.is_plus_one && <span className="ml-1 text-stone-400 text-[10px]">+1</span>}
      </span>
      {onSeat && (
        <button
          onClick={(e) => { e.stopPropagation(); onSeat(guest) }}
          title="Seat at a table…"
          aria-label={`Seat ${guest.first_name} ${guest.last_name} at a table`}
          className="p-1.5 -my-1 rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0"
        >
          <Armchair size={13} />
        </button>
      )}
    </div>
  )
}
