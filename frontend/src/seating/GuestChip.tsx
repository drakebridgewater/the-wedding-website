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
}

export function GuestChip({ guest, compact = false }: Props) {
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
