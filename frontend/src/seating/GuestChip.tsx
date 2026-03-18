import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { GuestSeating } from './types'

const MEAL_ICONS: Record<string, string> = {
  beef: '🥩',
  fish: '🐟',
  hen: '🍗',
  vegetarian: '🥦',
}

interface Props {
  guest: GuestSeating
  compact?: boolean
  row?: boolean
  onColorClick?: (e: React.MouseEvent) => void
}

export function GuestChip({ guest, compact = false, row = false, onColorClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: { type: 'guest', guest },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  const mealIcon = guest.meal ? (MEAL_ICONS[guest.meal] ?? '') : ''
  const avatarColor = guest.seat_color || '#e7e5e4'
  const initial = (guest.first_name[0] ?? '').toUpperCase()

  if (row) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing select-none touch-none hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200"
      >
        {/* Color swatch / avatar — clicking opens color picker */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onColorClick}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white hover:ring-stone-300 transition-all"
          style={{ backgroundColor: avatarColor }}
          title="Change color"
        >
          {initial}
        </button>
        <span className="flex-1 text-sm font-medium text-stone-800 truncate">
          {guest.first_name} {guest.last_name}
        </span>
        {guest.is_child && <span className="text-xs leading-none">👶</span>}
        {mealIcon && <span className="text-xs leading-none">{mealIcon}</span>}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-1.5 rounded-full border border-gray-200 bg-white
        cursor-grab active:cursor-grabbing select-none touch-none
        ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        shadow-sm hover:shadow-md transition-shadow
      `}
    >
      {guest.is_child && <span className="text-xs">👶</span>}
      <span className="font-medium text-gray-800">
        {guest.first_name} {guest.last_name}
      </span>
      {mealIcon && <span className="text-xs">{mealIcon}</span>}
    </div>
  )
}
