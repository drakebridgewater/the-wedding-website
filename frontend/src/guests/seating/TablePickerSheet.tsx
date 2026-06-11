import { Modal } from '../components/Modal'
import type { SeatingGuest, SeatingTable } from '../types'

/**
 * Bottom sheet for tap-based seating: pick a table for a guest or whole
 * party, or unseat them. Complements drag-and-drop, which is awkward on
 * touch screens.
 */
export function TablePickerSheet({
  title, tables, currentTableId, seatsNeeded, getAssignedGuests, onPick, onClose,
}: {
  title: string
  tables: SeatingTable[]
  /** Table the guest currently sits at, if any (shown as current, offers Unseat). */
  currentTableId: number | null
  /** How many seats this pick will occupy (party size incl. +1s). */
  seatsNeeded: number
  getAssignedGuests: (tableId: number) => SeatingGuest[]
  onPick: (tableId: number | null) => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      {tables.length === 0 ? (
        <p className="text-sm text-stone-400">No tables yet — add one first.</p>
      ) : (
        <div className="space-y-1.5">
          {tables.map((t) => {
            const occupants = getAssignedGuests(t.id)
            const isCurrent = t.id === currentTableId
            const wouldOverflow = !isCurrent && occupants.length + seatsNeeded > t.capacity
            return (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                disabled={isCurrent}
                className={`w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  isCurrent
                    ? 'border-stone-200 bg-stone-50 cursor-default'
                    : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-800 flex-1 truncate">{t.name}</span>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-500 font-medium">Current</span>
                  )}
                  {wouldOverflow && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">over capacity</span>
                  )}
                  <span className="text-xs text-stone-400 tabular-nums flex-shrink-0">
                    {occupants.length}/{t.capacity}
                  </span>
                </span>
                {occupants.length > 0 && (
                  <span className="block text-xs text-stone-400 mt-1">
                    {occupants.map((g) => `${g.first_name} ${g.last_name}`.trim()).join(', ')}
                  </span>
                )}
              </button>
            )
          })}
          {currentTableId !== null && (
            <button
              onClick={() => onPick(null)}
              className="w-full px-3 py-2.5 rounded-lg border border-dashed border-stone-300 text-sm text-stone-500 hover:border-rose-300 hover:text-rose-600 transition-colors"
            >
              Unseat
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
