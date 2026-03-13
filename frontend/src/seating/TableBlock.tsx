import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { SeatingTable } from './types'
import { TablePopup } from './TablePopup'

const CELL_SIZE = 56

interface Props {
  table: SeatingTable
  isOver?: boolean
}

export function TableBlock({ table, isOver }: Props) {
  const [popupOpen, setPopupOpen] = useState(false)

  const { setNodeRef: setDropRef } = useDroppable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id },
  })

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `table-move-${table.id}`,
    data: { type: 'table-move', tableId: table.id },
  })

  const isFull = table.assigned_count >= table.capacity
  const fillColor = isFull
    ? 'bg-amber-100 border-amber-400'
    : 'bg-rose-50 border-rose-300'
  const highlightColor = isOver ? 'ring-2 ring-rose-500 ring-offset-1' : ''

  const style = {
    position: 'absolute' as const,
    left: table.grid_x * CELL_SIZE,
    top: table.grid_y * CELL_SIZE,
    width: table.grid_width * CELL_SIZE - 4,
    height: table.grid_height * CELL_SIZE - 4,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : popupOpen ? 50 : 10,
    opacity: isDragging ? 0.7 : 1,
  }

  const isRound = table.shape === 'round'

  function setRef(el: HTMLElement | null) {
    setDropRef(el)
    setDragRef(el)
  }

  return (
    <div style={style} className="relative">
      <div
        ref={setRef}
        onClick={() => !isDragging && setPopupOpen((v) => !v)}
        className={`
          flex h-full w-full cursor-pointer flex-col items-center justify-center
          border-2 ${fillColor} ${highlightColor}
          ${isRound ? 'rounded-full' : 'rounded-lg'}
          select-none shadow-sm transition-shadow hover:shadow-md
        `}
        {...listeners}
        {...attributes}
      >
        <span className="text-xs font-semibold text-gray-800 leading-tight text-center px-1 truncate w-full text-center">
          {table.name}
        </span>
        <span className={`text-xs font-medium ${isFull ? 'text-amber-600' : 'text-rose-500'}`}>
          {table.assigned_count}/{table.capacity}
        </span>
      </div>

      {popupOpen && (
        <TablePopup
          table={table}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  )
}

export { CELL_SIZE }
