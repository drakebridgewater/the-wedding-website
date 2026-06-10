import type { InviteStatus } from '../types'
import { INVITE_STATUS_LABELS, INVITE_STATUS_COLORS } from '../types'

/** Inline invite-status pill that doubles as a select. */
export function StatusSelect({
  value, onChange,
}: {
  value: InviteStatus
  onChange: (s: InviteStatus) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as InviteStatus)}
      onClick={(e) => e.stopPropagation()}
      className={`text-[10px] px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-stone-400 ${INVITE_STATUS_COLORS[value]}`}
    >
      {(Object.entries(INVITE_STATUS_LABELS) as [InviteStatus, string][]).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  )
}
