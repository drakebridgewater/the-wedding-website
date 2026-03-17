import { useRef } from 'react'
import type { ScheduleEvent } from './types'
import { EventBranch, HOUR_PX, BAR_W, STEM_BASE, COLUMN_W } from './EventBranch'

const START_HOUR = 6
const END_HOUR = 24
const SPINE_X = 108      // x position of the spine
const MIN_PX = HOUR_PX / 60

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function snapTo15(totalMins: number): number {
  return Math.round(totalMins / 15) * 15
}

function minsToTimeStr(totalMins: number): string {
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatHourLabel(h: number): string {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function computeEventColumns(events: ScheduleEvent[]): Map<number, number> {
  const sorted = [...events].sort(
    (a, b) => parseTime(a.start_time) - parseTime(b.start_time),
  )
  const result = new Map<number, number>()
  const columnEnd: number[] = []

  for (const ev of sorted) {
    const start = parseTime(ev.start_time)
    const end = start + ev.duration_minutes
    let col = columnEnd.findIndex((endMins) => start >= endMins)
    if (col === -1) {
      col = columnEnd.length
      columnEnd.push(end)
    } else {
      columnEnd[col] = end
    }
    result.set(ev.id, col)
  }

  return result
}

interface Props {
  events: ScheduleEvent[]
  onTimeClick: (time: string) => void
  onEventClick: (event: ScheduleEvent) => void
}

export function Timeline({ events, onTimeClick, onEventClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const naturalHeight = hours.length * HOUR_PX

  const eventColumns = computeEventColumns(events)
  const maxColumn = events.length > 0 ? Math.max(...Array.from(eventColumns.values())) : 0
  const minWidth = SPINE_X + BAR_W + STEM_BASE + (maxColumn + 1) * COLUMN_W + 40

  function handleSpineClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-event]')) return
    const rect = containerRef.current!.getBoundingClientRect()
    const scrollTop = containerRef.current!.scrollTop
    const y = e.clientY - rect.top + scrollTop
    const minsFromStart = (y / HOUR_PX) * 60
    const snapped = snapTo15(minsFromStart + START_HOUR * 60)
    const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped))
    onTimeClick(minsToTimeStr(clamped))
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto select-none rounded-xl border border-stone-100 bg-white"
      style={{ height: 'calc(100vh - 220px)' }}
    >
      <div className="relative" style={{ height: naturalHeight + 40, minWidth }}>

        {/* Horizontal hour grid lines (full-width) */}
        {hours.map((h) => (
          <div
            key={`grid-${h}`}
            className="absolute left-0 right-0"
            style={{
              top: (h - START_HOUR) * HOUR_PX,
              height: 1,
              backgroundColor: h % 2 === 0 ? '#e7e5e4' : '#f5f4f3',
              zIndex: 1,
            }}
          />
        ))}

        {/* Half-hour subtle lines */}
        {hours.map((h) => (
          <div
            key={`half-${h}`}
            className="absolute right-0"
            style={{
              left: SPINE_X,
              top: (h - START_HOUR) * HOUR_PX + HOUR_PX / 2,
              height: 1,
              backgroundColor: '#f0efee',
              zIndex: 1,
            }}
          />
        ))}

        {/* Hour labels */}
        {hours.map((h) => (
          <div
            key={h}
            className="absolute flex items-center"
            style={{ top: (h - START_HOUR) * HOUR_PX - 9, left: 0, width: SPINE_X - 10 }}
          >
            <span className="text-[11px] text-stone-400 ml-auto leading-none font-medium tracking-wide">
              {formatHourLabel(h)}
            </span>
          </div>
        ))}

        {/* Spine — full-height clickable strip */}
        <div
          className="absolute top-0 cursor-crosshair"
          style={{ left: SPINE_X - 10, width: 22, height: naturalHeight + 40, zIndex: 5 }}
          onClick={handleSpineClick}
        >
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{ left: 10, width: 2, backgroundColor: '#d6d3d1' }}
          />
        </div>

        {/* Events */}
        {events.map((ev) => {
          const dotY = (parseTime(ev.start_time) - START_HOUR * 60) * MIN_PX
          const columnIndex = eventColumns.get(ev.id) ?? 0
          return (
            <EventBranch
              key={ev.id}
              event={ev}
              dotY={dotY}
              spineX={SPINE_X}
              columnIndex={columnIndex}
              onClick={() => onEventClick(ev)}
            />
          )
        })}

        {events.length === 0 && (
          <div
            className="absolute text-xs text-stone-400 italic pointer-events-none"
            style={{ left: SPINE_X + 20, top: 2 * HOUR_PX - 6 }}
          >
            ← Click the timeline to add an event
          </div>
        )}
      </div>
    </div>
  )
}
