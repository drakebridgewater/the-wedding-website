/** "HH:MM[:SS]" → minutes since midnight. */
export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Minutes since midnight → "HH:MM". */
export function minsToTimeStr(totalMins: number): string {
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function snapTo15(totalMins: number): number {
  return Math.round(totalMins / 15) * 15
}

/** "HH:MM[:SS]" → "2:30 PM" (minutes omitted on the hour). */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Event end as "2:30 PM", from start time + duration. */
export function formatEndTime(start: string, durationMinutes: number): string {
  return formatTime(minsToTimeStr(parseTime(start) + durationMinutes))
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
