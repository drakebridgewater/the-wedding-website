import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import type { Party } from '../types'
import { useClickOutside } from '../hooks/useClickOutside'

/** Searchable party combobox used when assigning an unassigned guest. */
export function PartyPicker({
  parties, onSelect, onNewParty, onCancel,
}: {
  parties: Party[]
  onSelect: (partyId: number) => void
  onNewParty: () => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const DROPDOWN_H = 228
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= DROPDOWN_H
        ? rect.bottom + 2
        : Math.max(8, rect.top - DROPDOWN_H)
      setDropdownPos({ top, left: rect.left })
    }
  }, [])

  useClickOutside([containerRef, dropdownRef], onCancel)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const filtered = query
    ? parties.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : parties

  const dropdown = dropdownPos ? createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: '14rem', zIndex: 9999 }}
      className="bg-white border border-stone-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
    >
      {filtered.length === 0 ? (
        <p className="px-3 py-2 text-xs text-stone-400 italic">
          {query ? `No parties match "${query}"` : 'No parties yet'}
        </p>
      ) : (
        filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 text-stone-700 border-b border-stone-50 last:border-0 transition-colors"
          >
            {p.name}
            {p.guests.length > 0 && (
              <span className="text-stone-400 ml-1.5">({p.guests.length})</span>
            )}
          </button>
        ))
      )}
      <button
        onClick={onNewParty}
        className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border-t border-stone-100 font-medium transition-colors"
      >
        + Create solo party
      </button>
    </div>,
    document.body,
  ) : null

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            ref={inputRef}
            placeholder="Search parties…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-6 pr-2 py-1.5 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 w-44"
          />
        </div>
        <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 flex-shrink-0 p-1">
          <X size={13} />
        </button>
      </div>
      {dropdown}
    </div>
  )
}
