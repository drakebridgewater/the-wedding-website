import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { SeatingGuest } from '../types'
import type { DragData } from './dnd'

/**
 * Draggable guest chip. The grip is the drag activator (not the whole chip)
 * so the surrounding lists stay scrollable on touch screens.
 */
export function GuestChip({ guest }: { guest: SeatingGuest }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: {
      type: 'guest',
      guestId: guest.id,
      currentTableId: guest.seating_table_id,
    } as DragData,
  })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={`flex items-center gap-1 pr-2 py-0.5 rounded-md border border-stone-200 bg-white text-xs text-stone-700 select-none transition-opacity ${isDragging ? 'opacity-30' : 'hover:border-stone-300'}`}
    >
      <button
        {...listeners}
        {...attributes}
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
      <span className="truncate">
        {guest.first_name} {guest.last_name}
        {guest.is_child && <span className="ml-1 text-stone-400 text-[10px]">child</span>}
        {guest.is_plus_one && <span className="ml-1 text-stone-400 text-[10px]">+1</span>}
      </span>
    </div>
  )
}
