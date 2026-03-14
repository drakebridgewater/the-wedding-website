import { useRef } from 'react'
import type { ScheduleEvent } from './types'
import { EventBlock } from './EventBlock'

export const HOUR_PX = 80
const START_HOUR = 6   // 6 AM
const END_HOUR = 24    // midnight

function snapTo15(mins: number): number {
  return Math.round(mins / 15) * 15
}

function minsToTimeStr(totalMins: number): string {
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function eventsOverlap(a: ScheduleEvent, b: ScheduleEvent): boolean {
  const aStart = parseTime(a.start_time)
  const aEnd = aStart + a.duration_minutes
  const bStart = parseTime(b.start_time)
  const bEnd = bStart + b.duration_minutes
  return aStart < bEnd && aEnd > bStart
}

// Assign column indices to events so overlapping ones appear side-by-side
function assignColumns(events: ScheduleEvent[]): Map<number, { column: number; total: number }> {
  const sorted = [...events].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))
  const result = new Map<number, { column: number; total: number }>()

  // Group overlapping events into clusters
  const clusters: ScheduleEvent[][] = []
  for (const ev of sorted) {
    let placed = false
    for (const cluster of clusters) {
      if (cluster.some((c) => eventsOverlap(c, ev))) {
        cluster.push(ev)
        placed = true
        break
      }
    }
    if (!placed) clusters.push([ev])
  }

  for (const cluster of clusters) {
    // Assign columns greedily
    const cols: number[] = []
    const colEnd: number[] = []
    for (const ev of cluster) {
      const evStart = parseTime(ev.start_time)
      let col = cols.find((_, i) => colEnd[i] <= evStart) ?? -1
      if (col === -1) {
        col = cols.length
        cols.push(col)
        colEnd.push(0)
      }
      colEnd[col] = evStart + ev.duration_minutes
      result.set(ev.id, { column: col, total: 0 })
    }
    const total = cols.length
    for (const ev of cluster) {
      const r = result.get(ev.id)!
      result.set(ev.id, { ...r, total })
    }
  }

  return result
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

interface Props {
  events: ScheduleEvent[]
  onTimeClick: (time: string) => void
  onEventClick: (event: ScheduleEvent) => void
}

export function Timeline({ events, onTimeClick, onEventClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = hours.length * HOUR_PX

  const columnMap = assignColumns(events)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    // Don't trigger if clicking on an event block
    if ((e.target as HTMLElement).closest('[data-event-block]')) return
    const rect = containerRef.current!.getBoundingClientRect()
    const y = e.clientY - rect.top + containerRef.current!.scrollTop
    const minsFromStart = (y / HOUR_PX) * 60
    const snapped = snapTo15(minsFromStart + START_HOUR * 60)
    const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped))
    onTimeClick(minsToTimeStr(clamped))
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      style={{ height: 'calc(100vh - 180px)' }}
    >
      <div
        className="relative"
        style={{ height: totalHeight, minWidth: 600 }}
        onClick={handleClick}
      >
        {/* Hour rows */}
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-gray-200"
            style={{ top: (h - START_HOUR) * HOUR_PX, height: HOUR_PX }}
          >
            <span className="absolute -top-2.5 left-1 text-xs text-gray-400 select-none w-12 text-right">
              {formatHour(h)}
            </span>
            {/* 30-min tick */}
            <div
              className="absolute left-0 right-0 border-t border-gray-100"
              style={{ top: HOUR_PX / 2 }}
            />
          </div>
        ))}

        {/* Bottom border */}
        <div
          className="absolute left-0 right-0 border-t border-gray-200"
          style={{ top: totalHeight }}
        />

        {/* Events layer — offset past hour labels */}
        <div className="absolute inset-0" style={{ left: 60 }} data-event-block>
          {events.map((ev) => {
            const layout = columnMap.get(ev.id) ?? { column: 0, total: 1 }
            return (
              <EventBlock
                key={ev.id}
                event={ev}
                column={layout.column}
                totalColumns={layout.total}
                dayStartHour={START_HOUR}
                onClick={onEventClick}
              />
            )
          })}
        </div>

        {/* Invisible click target for adding events (left of events layer) */}
        <div className="absolute inset-0" style={{ right: 'auto', width: 60 }} />
      </div>
    </div>
  )
}
