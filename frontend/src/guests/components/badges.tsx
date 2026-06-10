import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Guest, WeddingPartyMember } from '../types'

export type BadgeTone =
  | 'stone' | 'muted' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'indigo'

const TONES: Record<BadgeTone, string> = {
  stone:   'bg-stone-100 text-stone-600',
  muted:   'bg-stone-100 text-stone-400',
  emerald: 'bg-emerald-100 text-emerald-700',
  rose:    'bg-rose-100 text-rose-600',
  amber:   'bg-amber-100 text-amber-700',
  sky:     'bg-sky-100 text-sky-600',
  violet:  'bg-violet-100 text-violet-600',
  indigo:  'bg-indigo-100 text-indigo-600',
}

export function Badge({
  tone = 'stone', title, className, children,
}: {
  tone?: BadgeTone
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap', TONES[tone], className)}
    >
      {children}
    </span>
  )
}

// ── Attending (Yes / No / Pending) ────────────────────────────────────────────

export function attendingTone(v: boolean | null): BadgeTone {
  return v === true ? 'emerald' : v === false ? 'rose' : 'muted'
}

export function attendingLabel(v: boolean | null): string {
  return v === true ? 'Yes' : v === false ? 'No' : 'Pending'
}

export function AttendingBadge({
  value, onClick,
}: {
  value: boolean | null
  /** When provided, the badge becomes a tap target that cycles the value. */
  onClick?: () => void
}) {
  if (!onClick) return <Badge tone={attendingTone(value)}>{attendingLabel(value)}</Badge>
  const hover =
    value === true ? 'hover:bg-emerald-200' : value === false ? 'hover:bg-rose-200' : 'hover:bg-stone-200'
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title="Click to cycle: Pending → Yes → No → Pending"
      className={cn(
        'text-[10px] px-2 py-1 rounded-full font-medium transition-colors cursor-pointer whitespace-nowrap',
        TONES[attendingTone(value)], hover,
      )}
    >
      {attendingLabel(value)}
    </button>
  )
}

// ── Guest flags (+1 / child / wedding-party role) ─────────────────────────────

export function GuestFlags({ guest, member }: { guest: Guest; member?: WeddingPartyMember }) {
  return (
    <>
      {guest.is_plus_one && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">+1</span>
      )}
      {guest.is_child && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>
      )}
      {member && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium border whitespace-nowrap"
          style={{ backgroundColor: member.color + '33', borderColor: member.color + '88', color: member.color }}
        >
          {member.role.replace('_', ' ')}
        </span>
      )}
    </>
  )
}
