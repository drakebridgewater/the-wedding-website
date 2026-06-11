import { useState } from 'react'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import type { SeatingTable } from '../types'
import type { PartyGroup } from './dnd'

/**
 * Bottom sheet for table-first seating: tick unseated guests (or whole
 * parties) and seat them at this table in one go.
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
  const [selected, setSelected] = useState<Set<number>>(new Set())

  function toggleGuest(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGroup(group: PartyGroup) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allIn = group.guests.every((g) => next.has(g.id))
      for (const g of group.guests) allIn ? next.delete(g.id) : next.add(g.id)
      return next
    })
  }

  const resulting = assignedCount + selected.size
  const overCapacity = resulting > table.capacity

  return (
    <Modal
      title={`Add guests to ${table.name}`}
      onClose={onClose}
      footer={
        <>
          {overCapacity && (
            <span className="text-xs text-amber-600 self-center mr-auto">
              Will be over capacity ({resulting}/{table.capacity})
            </span>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={selected.size === 0}
            onClick={() => onAssign(Array.from(selected))}
          >
            Seat {selected.size || ''} {selected.size === 1 ? 'guest' : 'guests'}
          </Button>
        </>
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-stone-400">Everyone is seated already.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-stone-400">
            {assignedCount}/{table.capacity} seats filled · tap a party name to select everyone in it
          </p>
          {groups.map((group) => {
            const allIn = group.guests.every((g) => selected.has(g.id))
            return (
              <div key={group.key} className="border border-stone-200 rounded-lg overflow-hidden">
                <label className="flex items-center gap-2.5 px-3 py-2 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allIn}
                    onChange={() => toggleGroup(group)}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  <span className="text-xs font-medium text-stone-700 flex-1 truncate">{group.partyName}</span>
                  <span className="text-[10px] text-stone-400">
                    {group.guests.length}
                    {group.plusOneCount > 0 && <span className="text-amber-500"> +{group.plusOneCount}</span>}
                  </span>
                </label>
                <div className="divide-y divide-stone-50">
                  {group.guests.map((g) => (
                    <label key={g.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-50">
                      <input
                        type="checkbox"
                        checked={selected.has(g.id)}
                        onChange={() => toggleGuest(g.id)}
                        className="w-4 h-4 rounded border-stone-300"
                      />
                      <span className="text-xs text-stone-700 flex-1 truncate">
                        {g.first_name} {g.last_name}
                        {g.is_child && <span className="ml-1 text-stone-400 text-[10px]">child</span>}
                        {g.is_plus_one && <span className="ml-1 text-stone-400 text-[10px]">+1</span>}
                      </span>
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          g.is_attending === true ? 'bg-emerald-400' : 'bg-amber-300'
                        }`}
                        title={g.is_attending === true ? 'Attending' : 'Pending RSVP'}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
