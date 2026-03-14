import { AlertTriangle } from 'lucide-react'
import type { ScheduleEvent } from './types'
import { CATEGORY_COLORS } from './types'

const HOUR_PX = 80  // must match Timeline

interface Props {
  event: ScheduleEvent
  column: number       // 0-indexed column for side-by-side overlap layout
  totalColumns: number
  dayStartHour: number
  onClick: (event: ScheduleEvent) => void
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function EventBlock({ event, column, totalColumns, dayStartHour, onClick }: Props) {
  const startMins = parseTime(event.start_time)
  const topPx = (startMins - dayStartHour * 60) * (HOUR_PX / 60)
  const heightPx = Math.max(event.duration_minutes * (HOUR_PX / 60), 20)

  const color = CATEGORY_COLORS[event.category]
  const hasConflict = event.conflicts.length > 0

  const widthPct = 100 / totalColumns
  const leftPct = column * widthPct

  return (
    <div
      className="absolute rounded-lg px-2 py-1 cursor-pointer hover:brightness-95 transition-all overflow-hidden"
      style={{
        top: topPx,
        height: heightPx,
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 4px)`,
        backgroundColor: color,
        opacity: 0.92,
      }}
      onClick={() => onClick(event)}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold text-white leading-tight truncate">
          {event.name}
        </span>
        {hasConflict && (
          <AlertTriangle size={12} className="text-yellow-200 shrink-0 mt-0.5" />
        )}
      </div>

      {heightPx >= 40 && (
        <div className="mt-0.5 space-y-0.5">
          {event.location && (
            <p className="text-xs text-white/80 truncate">{event.location}</p>
          )}
          {event.attendees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {event.attendees.map((a) => (
                <span
                  key={a.id}
                  className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white/90"
                  style={{ backgroundColor: `${a.color}99` }}
                  title={hasConflict && event.conflicts.includes(a.id) ? `${a.name} is double-booked` : a.name}
                >
                  {a.name}
                  {event.conflicts.includes(a.id) && ' ⚠'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
