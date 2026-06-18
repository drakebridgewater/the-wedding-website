import { Pencil, Plus } from 'lucide-react'
import type { ScheduleDay } from './types'

interface Props {
  days: ScheduleDay[]
  selectedId: number | null
  onSelect: (id: number) => void
  onAddDay?: () => void
  onEditDay?: (day: ScheduleDay) => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function DayTabs({ days, selectedId, onSelect, onAddDay, onEditDay }: Props) {
  if (days.length === 0 && !onAddDay) return null

  return (
    <div className="flex gap-1 border-b border-stone-200 mb-4 overflow-x-auto items-center">
      {days.map((day) => {
        const active = day.id === selectedId
        return (
          <button
            key={day.id}
            onClick={() => onSelect(day.id)}
            className={`
              group inline-flex items-center px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${active
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}
            `}
          >
            <span>{day.label}</span>
            <span className="ml-1.5 text-xs font-normal opacity-60">{formatDate(day.date)}</span>
            {active && onEditDay && (
              <span
                role="button"
                aria-label={`Edit ${day.label}`}
                title="Edit day"
                onClick={(e) => { e.stopPropagation(); onEditDay(day) }}
                className="ml-1.5 p-1 -my-1 rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <Pencil size={11} />
              </span>
            )}
          </button>
        )
      })}
      {onAddDay && (
        <button
          onClick={onAddDay}
          title="Add a schedule day"
          className="inline-flex items-center gap-1 px-3 py-2 my-0.5 ml-1 text-xs font-medium text-stone-400 hover:text-stone-700 border border-dashed border-stone-300 hover:border-stone-400 rounded-lg whitespace-nowrap transition-colors flex-shrink-0"
        >
          <Plus size={12} /> Add day
        </button>
      )}
    </div>
  )
}
