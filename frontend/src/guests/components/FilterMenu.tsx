import { useRef, useState } from 'react'
import { Check, SlidersHorizontal, X } from 'lucide-react'
import { useClickOutside } from '../hooks/useClickOutside'

export interface FilterOption {
  id: string
  label: string
  title?: string
  count: number
}

/** One filter axis. At most one option per section is active; sections AND together. */
export interface FilterSection {
  id: string
  label: string
  value: string | null
  options: FilterOption[]
  onChange: (id: string | null) => void
}

/**
 * Every filter axis behind one dropdown, with the active choices shown as
 * removable chips beside it so the current state is readable when it's closed.
 *
 * Options matching nothing are hidden, so the menu stays short early on (before
 * any invitations go out) and grows with the data.
 */
export function FilterMenu({ sections, className = '' }: {
  sections: FilterSection[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => setOpen(false), open)

  const active = sections.flatMap((section) => {
    const option = section.options.find((o) => o.id === section.value)
    return option ? [{ section, option }] : []
  })

  const visibleSections = sections
    .map((section) => ({
      section,
      options: section.options.filter((o) => o.count > 0 || o.id === section.value),
    }))
    .filter(({ options }) => options.length > 0)

  return (
    <div className={`flex gap-1.5 flex-wrap items-center ${className}`}>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium border transition-colors ${
            active.length
              ? 'bg-stone-800 text-white border-stone-800'
              : 'border-stone-300 text-stone-600 hover:border-stone-400 hover:text-stone-800'
          }`}
        >
          <SlidersHorizontal size={12} />
          Filters
          {active.length > 0 && (
            <span className="bg-white/25 rounded-full px-1.5 leading-4">{active.length}</span>
          )}
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-64 max-h-[26rem] overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-lg py-1">
            {visibleSections.length === 0 && (
              <p className="px-3 py-2 text-xs text-stone-400">Nothing to filter on yet.</p>
            )}
            {visibleSections.map(({ section, options }) => (
              <div key={section.id} className="py-1 border-b border-stone-50 last:border-0">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-stone-400">
                  {section.label}
                </p>
                {options.map((option) => {
                  const selected = section.value === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      title={option.title}
                      onClick={() => section.onChange(selected ? null : option.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <Check size={12} className={selected ? 'text-stone-800' : 'text-transparent'} />
                      <span className="flex-1 text-left truncate">{option.label}</span>
                      <span className="text-stone-400">{option.count}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {active.map(({ section, option }) => (
        <button
          key={section.id}
          onClick={() => section.onChange(null)}
          title={`${section.label}: ${option.title ?? option.label} — click to remove`}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
        >
          {section.label}: {option.label}
          <X size={11} className="text-stone-400" />
        </button>
      ))}

      {active.length > 1 && (
        <button
          onClick={() => active.forEach(({ section }) => section.onChange(null))}
          className="text-xs text-stone-400 hover:text-stone-700 hover:underline px-1 py-1.5"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
