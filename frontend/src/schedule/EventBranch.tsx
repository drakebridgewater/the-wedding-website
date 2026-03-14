import { AlertTriangle } from 'lucide-react'
import type { ScheduleEvent } from './types'
import { CATEGORY_COLORS } from './types'

export const HOUR_PX = 80     // vertical px per hour (shared with Timeline)

// ─── Layout constants ────────────────────────────────────────────────────────
export const BAR_W = 8        // width of each column's duration bar on the spine
export const STEM_BASE = 16   // gap between the rightmost bar and the first bubble column
export const COLUMN_W = 175   // horizontal spacing between bubble columns
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

interface Props {
  event: ScheduleEvent
  dotY: number        // y coordinate of the event's start time on the spine
  spineX: number
  columnIndex: number // 0 = no overlap; 1, 2 ... = shifted right to avoid overlap
  onClick: () => void
}

export function EventBranch({ event, dotY, spineX, columnIndex, onClick }: Props) {
  const color = CATEGORY_COLORS[event.category]
  const hasConflict = event.conflicts.length > 0

  const barHeight = Math.max(event.duration_minutes * (HOUR_PX / 60), 4)

  // Each column's bar sits immediately to the right of the previous one.
  // Column 0 starts flush with the spine; columns 1, 2 … march right.
  const barLeft   = spineX + columnIndex * BAR_W
  const stemStart = barLeft + BAR_W

  // Bubble columns start after a fixed gap beyond the first bar.
  const bubbleLeft = spineX + BAR_W + STEM_BASE + columnIndex * COLUMN_W
  const stemWidth  = bubbleLeft - stemStart   // always ≥ STEM_BASE for column 0

  return (
    <>
      {/* ── Duration bar on the spine (side-by-side per column) ── */}
      <div
        className="absolute"
        style={{
          left: barLeft,
          top: dotY,
          width: BAR_W - 1,   // 1 px gap so adjacent bars are visually distinct
          height: barHeight,
          backgroundColor: color,
          zIndex: 8,
        }}
      />

      {/* ── Horizontal stem: right edge of bar → left edge of bubble ── */}
      <div
        className="absolute"
        style={{
          left: stemStart,
          top: dotY - 1,
          width: stemWidth,
          height: 2,
          backgroundColor: color,
          opacity: 0.4,
          zIndex: 6,
        }}
      />

      {/* ── Bubble card with category color tint ── */}
      <div
        data-event
        className="absolute cursor-pointer rounded-2xl border shadow-sm
                   hover:shadow-md transition-shadow px-3 py-2 min-w-[160px] max-w-[260px]"
        style={{
          left: bubbleLeft,
          top: dotY,
          backgroundColor: `${color}18`,
          borderColor: `${color}55`,
          zIndex: 20,
        }}
        onClick={onClick}
      >
        {/* Bold category accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />

        <div className="pl-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] leading-none mb-0.5 font-medium" style={{ color }}>
                {formatTime(event.start_time)}
                {event.location && <span className="ml-1 opacity-75">· {event.location}</span>}
              </p>
              <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                {event.name}
              </p>
            </div>
            {hasConflict && (
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            )}
          </div>

          {event.attendees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {event.attendees.map((a) => (
                <span
                  key={a.id}
                  className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
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
