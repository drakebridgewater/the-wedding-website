import { AlertTriangle } from 'lucide-react'
import type { ScheduleEvent } from './types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from './types'

export const HOUR_PX = 80     // vertical px per hour (shared with Timeline)

// ─── Layout constants ────────────────────────────────────────────────────────
export const BAR_W    = 4     // width of each column's duration bar on the spine
export const STEM_BASE = 20   // gap from spine to first bubble column
export const COLUMN_W  = 220  // horizontal spacing between bubble columns
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

interface Props {
  event: ScheduleEvent
  dotY: number
  spineX: number
  columnIndex: number
  onClick: () => void
}

export function EventBranch({ event, dotY, spineX, columnIndex, onClick }: Props) {
  const color = CATEGORY_COLORS[event.category]
  const hasConflict = event.conflicts.length > 0
  const barHeight = Math.max(event.duration_minutes * (HOUR_PX / 60), 6)

  const barLeft    = spineX + columnIndex * BAR_W
  const stemStart  = spineX + BAR_W * (columnIndex + 1)
  const bubbleLeft = spineX + BAR_W + STEM_BASE + columnIndex * COLUMN_W
  const stemWidth  = bubbleLeft - stemStart

  return (
    <>
      {/* Duration bar on the spine */}
      <div
        className="absolute rounded-sm"
        style={{
          left: barLeft,
          top: dotY,
          width: BAR_W - 1,
          height: barHeight,
          backgroundColor: color,
          opacity: 0.85,
          zIndex: 8,
        }}
      />

      {/* Circle dot at event start */}
      <div
        className="absolute rounded-full"
        style={{
          left: barLeft - 2,
          top: dotY - 3,
          width: 8,
          height: 8,
          backgroundColor: color,
          border: '2px solid white',
          boxShadow: '0 0 0 1px ' + color + '40',
          zIndex: 10,
        }}
      />

      {/* Thin horizontal connector */}
      <div
        className="absolute"
        style={{
          left: stemStart,
          top: dotY,
          width: stemWidth,
          height: 1,
          backgroundColor: color,
          opacity: 0.15,
          zIndex: 6,
        }}
      />

      {/* Clean white event card */}
      <div
        data-event
        className="absolute cursor-pointer rounded-xl bg-white border border-stone-200 shadow-sm
                   hover:shadow-md hover:border-stone-300 transition-all px-3 py-2.5
                   min-w-[170px] max-w-[250px]"
        style={{ left: bubbleLeft, top: dotY, zIndex: 20 }}
        onClick={onClick}
      >
        {/* Left color bar */}
        <div
          className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
          style={{ backgroundColor: color }}
        />

        {hasConflict && (
          <AlertTriangle size={11} className="absolute top-2.5 right-2.5 text-amber-500" />
        )}

        <div className="pl-3 pr-4">
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color }}>
            {CATEGORY_LABELS[event.category]}
          </p>

          <p className="text-[13px] font-semibold text-stone-800 leading-tight truncate mb-0.5">
            {event.name}
          </p>

          <p className="text-[11px] text-stone-400 leading-none">
            {formatTime(event.start_time)}
            {event.location && <span className="ml-1">· {event.location}</span>}
          </p>

          {event.attendees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {event.attendees.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white"
                  style={{ backgroundColor: a.color }}
                  title={event.conflicts.includes(a.id) ? `${a.name} is double-booked` : a.name}
                >
                  {a.name}
                  {event.conflicts.includes(a.id) && ' ⚠'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
