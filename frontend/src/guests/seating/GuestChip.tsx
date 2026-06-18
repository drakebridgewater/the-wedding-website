import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Armchair, GripVertical, Pencil, X } from 'lucide-react'
import type { SeatingGuest } from '../types'
import type { DragData } from './dnd'

/**
 * Draggable guest chip. The whole card is the drag handle; the action buttons
 * stop the pointer from starting a drag so they stay tappable. Tapping the card
 * does NOT open the editor — use the "Edit" button for that. "Seat"/"Move"
 * opens the table picker, and "Remove" (seated guests) takes them off the table.
 */
export function GuestChip({
  guest, onOpenGuest, onSeat, onRemove,
}: {
  guest: SeatingGuest
  onOpenGuest?: (partyId: number, guestId: number) => void
  onSeat?: (guest: SeatingGuest) => void
  onRemove?: (guest: SeatingGuest) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: {
      type: 'guest',
      guestId: guest.id,
      currentTableId: guest.seating_table_id,
    } as DragData,
  })

  const canEdit = onOpenGuest && guest.party_id != null

  // Keep a button press from starting a card drag (listeners live on the card).
  const stopDrag = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation()

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...listeners}
      {...attributes}
      title="Drag to a table"
      className={`flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-md border border-stone-200 bg-white text-xs text-stone-700 select-none cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : 'hover:border-stone-300'}`}
    >
      <GripVertical size={12} className="flex-shrink-0 text-stone-300" />
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
      {canEdit && (
        <button
          onMouseDown={stopDrag}
          onClick={(e) => { stopDrag(e); onOpenGuest!(guest.party_id!, guest.id) }}
          title="Edit guest"
          aria-label={`Edit ${guest.first_name} ${guest.last_name}`}
          className="flex flex-shrink-0 items-center gap-0.5 -my-1 rounded px-1.5 py-1 text-[11px] font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        >
          <Pencil size={11} /> Edit
        </button>
      )}
      {onSeat && (
        <button
          onMouseDown={stopDrag}
          onClick={(e) => { stopDrag(e); onSeat(guest) }}
          title={onRemove ? 'Move to another table…' : 'Seat at a table…'}
          aria-label={`${onRemove ? 'Move' : 'Seat'} ${guest.first_name} ${guest.last_name}`}
          className="flex flex-shrink-0 items-center gap-0.5 -my-1 rounded px-1.5 py-1 text-[11px] font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        >
          <Armchair size={12} /> {onRemove ? 'Move' : 'Seat'}
        </button>
      )}
      {onRemove && (
        <button
          onMouseDown={stopDrag}
          onClick={(e) => { stopDrag(e); onRemove(guest) }}
          title={`Remove ${guest.first_name} ${guest.last_name} from this table`}
          aria-label={`Remove ${guest.first_name} ${guest.last_name} from this table`}
          className="flex flex-shrink-0 items-center gap-0.5 -my-1 rounded px-1.5 py-1 text-[11px] font-medium text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <X size={12} /> Remove
        </button>
      )}
    </div>
  )
}
