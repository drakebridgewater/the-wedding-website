import type { ScheduleDay } from './types'

interface Props {
  days: ScheduleDay[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function DayTabs({ days, selectedId, onSelect }: Props) {
  if (days.length === 0) return null

  return (
    <div className="flex gap-1 border-b border-stone-200 mb-4 overflow-x-auto">
      {days.map((day) => {
        const active = day.id === selectedId
        return (
          <button
            key={day.id}
            onClick={() => onSelect(day.id)}
            className={`
              px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${active
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}
            `}
          >
            <span>{day.label}</span>
            <span className="ml-1.5 text-xs font-normal opacity-60">{formatDate(day.date)}</span>
          </button>
        )
      })}
    </div>
  )
}
