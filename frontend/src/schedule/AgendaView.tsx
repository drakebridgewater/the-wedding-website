import { AlertTriangle, Globe, MapPin } from 'lucide-react'
import type { ScheduleEvent } from './types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from './types'
import { formatDuration, formatEndTime, formatTime, parseTime } from './time'

/**
 * Chronological card list of the day's events — the mobile-first way to read
 * and edit the schedule (the timeline stays as the desktop spatial view).
 */
export function AgendaView({
  events, onEventClick, onAdd,
}: {
  events: ScheduleEvent[]
  onEventClick: (event: ScheduleEvent) => void
  onAdd: () => void
}) {
  const sorted = [...events].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400 bg-white rounded-xl border border-stone-100">
        <p className="text-sm">No events on this day yet.</p>
        <button onClick={onAdd} className="mt-3 text-sm text-rose-600 hover:underline">
          Add the first one →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((ev) => {
        const color = CATEGORY_COLORS[ev.category]
        const hasConflict = ev.conflicts.length > 0
        return (
          <button
            key={ev.id}
            onClick={() => onEventClick(ev)}
            className="w-full text-left bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all overflow-hidden flex"
          >
            {/* Category color bar */}
            <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }} />

            {/* Time block */}
            <div className="w-[4.5rem] sm:w-24 flex-shrink-0 px-2 sm:px-3 py-3 border-r border-stone-50 text-right">
              <p className="text-sm font-semibold text-stone-800 leading-tight">{formatTime(ev.start_time)}</p>
              <p className="text-[10px] text-stone-400 mt-0.5">{formatEndTime(ev.start_time, ev.duration_minutes)}</p>
              <p className="text-[10px] text-stone-300">{formatDuration(ev.duration_minutes)}</p>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 px-3 py-2.5">
              <div className="flex items-start gap-1.5">
                <p className="text-sm font-semibold text-stone-800 leading-tight flex-1 min-w-0">{ev.name}</p>
                <span className="flex gap-1 flex-shrink-0 mt-0.5">
                  {ev.is_public && <Globe size={11} className="text-emerald-500" aria-label="On public program" />}
                  {hasConflict && <AlertTriangle size={11} className="text-amber-500" aria-label="Scheduling conflict" />}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color }}>
                {CATEGORY_LABELS[ev.category]}
                {ev.location && (
                  <span className="ml-2 font-normal normal-case tracking-normal text-stone-400 inline-flex items-center gap-0.5">
                    <MapPin size={9} /> {ev.location}
                  </span>
                )}
              </p>
              {ev.attendees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ev.attendees.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white"
                      style={{ backgroundColor: a.color }}
                      title={ev.conflicts.includes(a.id) ? `${a.name} is double-booked` : a.name}
                    >
                      {a.name}
                      {ev.conflicts.includes(a.id) && ' ⚠'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
