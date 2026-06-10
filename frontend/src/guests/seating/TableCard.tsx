import { useDroppable } from '@dnd-kit/core'
import { AlertTriangle, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../components/Button'
import type { SeatingGuest, SeatingTable } from '../types'
import { GuestChip } from './GuestChip'
import type { DropTarget } from './dnd'

function CapacityDot({ assigned, capacity }: { assigned: number; capacity: number }) {
  const [color, label] =
    assigned === 0
      ? ['bg-red-400', 'Empty']
      : assigned < capacity
      ? ['bg-amber-400', 'Has room']
      : ['bg-green-500', 'Full']
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} title={label} />
}

/** One seating table: drop target + assigned guest chips. */
export function TableCard({
  table, assignedGuests, collapsed, onToggle, onEdit, onDelete,
}: {
  table: SeatingTable
  assignedGuests: SeatingGuest[]
  collapsed: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id } as DropTarget,
  })

  const assigned = assignedGuests.length
  const overCapacity = assigned > table.capacity

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-50/30 shadow-sm'
          : overCapacity
          ? 'border-red-200 bg-white'
          : 'border-stone-200 bg-white'
      }`}
    >
      {/* Header row: [chevron] Name — capacity/max — dot  [edit] [delete] */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-stone-50/70 rounded-xl select-none"
        onClick={onToggle}
      >
        {collapsed
          ? <ChevronRight size={13} className="text-stone-400 flex-shrink-0" />
          : <ChevronDown size={13} className="text-stone-400 flex-shrink-0" />}
        <span className="text-sm font-medium text-stone-800 flex-1 truncate">{table.name}</span>
        <span className="text-xs text-stone-400 tabular-nums flex-shrink-0">
          {assigned}/{table.capacity}
        </span>
        <CapacityDot assigned={assigned} capacity={table.capacity} />
        {overCapacity && (
          <span title="Over capacity" className="flex-shrink-0">
            <AlertTriangle size={11} className="text-red-400" />
          </span>
        )}
        <div className="flex ml-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <IconButton title="Edit table" onClick={onEdit}>
            <Pencil size={11} />
          </IconButton>
          <IconButton title="Delete table" danger onClick={onDelete}>
            <Trash2 size={11} />
          </IconButton>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3">
          {table.notes && (
            <p className="text-xs text-stone-400 italic mb-2 border-t border-stone-100 pt-2">{table.notes}</p>
          )}
          {assignedGuests.length === 0 ? (
            <p className="text-xs text-stone-300 italic text-center py-3">Drop guests here</p>
          ) : (
            <div className="flex flex-col gap-1 border-t border-stone-100 pt-2">
              {assignedGuests.map((g) => <GuestChip key={g.id} guest={g} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
