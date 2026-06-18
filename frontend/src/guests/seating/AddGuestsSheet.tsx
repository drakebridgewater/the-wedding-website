import { useMemo, useRef, useState } from 'react'
import { Check, HelpCircle, Info, UserPlus, Users } from 'lucide-react'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import type { SeatingGuest, SeatingTable } from '../types'
import type { PartyGroup } from './dnd'

interface Row {
  guest: SeatingGuest
  group: PartyGroup
}

/**
 * Table-first seating. Type a name to filter the unseated guests, then:
 *  - press Enter / tap "Add" to seat the highlighted guest,
 *  - press Ctrl+Enter / tap "Add party" to seat their whole party, or
 *  - tick several guests and tap "Add N guests" to seat a custom group.
 * Stays open so several can be seated in a row.
 */
export function AddGuestsSheet({
  table, groups, assignedCount, onAssign, onClose,
}: {
  table: SeatingTable
  groups: PartyGroup[]
  assignedCount: number
  onAssign: (guestIds: number[]) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showTip, setShowTip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flatten the unseated party groups into rows, keeping each guest's party.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const group of groups) for (const g of group.guests) out.push({ guest: g, group })
    return out
  }, [groups])

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return rows
    return rows.filter(({ guest, group }) =>
      `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(q) ||
      group.partyName.toLowerCase().includes(q),
    )
  }, [rows, q])

  const idx = Math.min(highlight, Math.max(0, matches.length - 1))
  const sel = matches[idx] ?? null
  const seatsLeft = table.capacity - assignedCount
  const multiMode = selected.size > 0

  function reset() {
    setQuery('')
    setHighlight(0)
    setSelected(new Set())
    inputRef.current?.focus()
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addGuest(r: Row | null) {
    if (!r) return
    onAssign([r.guest.id])
    reset()
  }

  function addParty(r: Row | null) {
    if (!r || multiMode) return
    onAssign(r.group.guests.map((g) => g.id))
    reset()
  }

  function addSelected() {
    if (selected.size === 0) return
    onAssign(Array.from(selected))
    reset()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!multiMode) addParty(sel)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      multiMode ? addSelected() : addGuest(sel)
    }
  }

  const selName = sel ? `${sel.guest.first_name} ${sel.guest.last_name}`.trim() : ''
  const selPartyCount = sel ? sel.group.guests.length : 0

  return (
    <Modal
      title={`Add guests to ${table.name}`}
      onClose={onClose}
      footer={
        <>
          <span className={`mr-auto self-center text-xs ${seatsLeft <= 0 ? 'text-amber-600' : 'text-stone-400'}`}>
            {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left` : 'Table full'}
          </span>
          <Button
            variant="primary"
            disabled={multiMode ? false : !sel}
            onClick={() => (multiMode ? addSelected() : addGuest(sel))}
            title={multiMode
              ? `Seat the ${selected.size} selected guest${selected.size === 1 ? '' : 's'} at ${table.name}  (shortcut: Enter)`
              : sel
                ? `Add ${selName} to ${table.name}  (shortcut: Enter)`
                : 'Type a name, then add the guest'}
            className="bg-rose-600 hover:bg-rose-700"
          >
            <UserPlus size={13} /> {multiMode ? `Add ${selected.size} guest${selected.size === 1 ? '' : 's'}` : 'Add'}
          </Button>
          <Button
            variant="secondary"
            disabled={multiMode || !sel}
            onClick={() => addParty(sel)}
            title={multiMode
              ? 'Clear your selection to add a whole party'
              : sel
                ? `Add ${selName}${selPartyCount > 1 ? `’s whole party (${selPartyCount} people)` : ''} to ${table.name}  (shortcut: Ctrl+Enter)`
                : 'Type a name, then add their whole party'}
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Users size={13} /> Add party{!multiMode && selPartyCount > 1 ? ` (${selPartyCount})` : ''}
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">Everyone is seated already.</p>
      ) : (
        <div>
          {/* Help toggle — keeps the form clean until it's needed */}
          <div className="mb-1.5 flex justify-end">
            <button
              onClick={() => setShowTip((v) => !v)}
              aria-expanded={showTip}
              className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600"
            >
              <HelpCircle size={12} /> What do the labels mean?
            </button>
          </div>
          {showTip && (
            <div className="mb-3 flex gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-stone-400" />
              <p>
                The grey label on the right is each guest’s <strong>party</strong> and how many people are in it
                (e.g. <span className="text-stone-600">College Friends · 4</span>). Tick several names to seat a custom
                group, or use <strong>Add party</strong> to seat a whole group together.
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlight(0) }}
            onKeyDown={onKeyDown}
            placeholder="Type a name…"
            enterKeyHint="done"
            autoCapitalize="words"
            autoComplete="off"
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-base placeholder:text-stone-400 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-200"
          />
          {multiMode ? (
            <p className="mt-1.5 flex items-center justify-center gap-2 text-[11px] text-stone-500">
              <span className="font-medium text-rose-600">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())} className="text-stone-400 underline hover:text-stone-600">
                Clear
              </button>
            </p>
          ) : (
            <p className="mt-1.5 text-center text-[11px] text-stone-400">
              Press <span className="font-medium text-stone-500">Enter</span> to add ·{' '}
              <span className="font-medium text-stone-500">Ctrl+Enter</span> for the whole party ·{' '}
              tap to multi-select
            </p>
          )}

          <ul className="mt-2 max-h-72 overflow-y-auto">
            {matches.length === 0 ? (
              <li className="px-1 py-3 text-sm text-stone-400">No one matches “{query}”.</li>
            ) : (
              matches.map((r, i) => {
                const isSelected = selected.has(r.guest.id)
                return (
                  <li key={r.guest.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => toggleSelect(r.guest.id)}
                      title={`Tap to select ${r.guest.first_name} ${r.guest.last_name}`}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                        isSelected ? 'bg-rose-50' : i === idx ? 'bg-stone-100' : 'hover:bg-stone-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                          isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-stone-300'
                        }`}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span
                          className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            r.guest.is_attending === true ? 'bg-emerald-400' : 'bg-amber-300'
                          }`}
                        />
                        <span className="truncate text-stone-700">
                          {r.guest.first_name} {r.guest.last_name}
                          {r.guest.is_child && <span className="ml-1 text-[10px] text-stone-400">child</span>}
                        </span>
                      </span>
                      {r.group.guests.length > 1 && r.group.partyName && (
                        <span className="flex-shrink-0 text-xs text-stone-400">
                          {r.group.partyName} · {r.group.guests.length}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </Modal>
  )
}
