import { cn } from '@/lib/utils'

const ACTIVE_TONES = {
  emerald: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  sky:     'bg-sky-100 text-sky-700 hover:bg-sky-200',
  amber:   'bg-amber-100 text-amber-700 hover:bg-amber-200',
} as const

/**
 * Small on/off pill used for per-party flags (rehearsal dinner, physical
 * card, +1 allowed). Off state renders as a dotted outline.
 */
export function TogglePill({
  label, active, tone, titleOn, titleOff, onToggle, className,
}: {
  label: string
  active: boolean
  tone: keyof typeof ACTIVE_TONES
  titleOn: string
  titleOff: string
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      title={active ? titleOn : titleOff}
      className={cn(
        'text-[10px] px-2 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
        active
          ? ACTIVE_TONES[tone]
          : 'border border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-600',
        className,
      )}
    >
      {label}
    </button>
  )
}
