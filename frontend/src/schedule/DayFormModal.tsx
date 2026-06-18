import { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { DayFormData, ScheduleDay } from './types'

/** Create or edit a schedule day (label + date); deleting removes its events too. */
export function DayFormModal({
  day, nextOrder, onSave, onDelete, onClose, saving,
}: {
  day?: ScheduleDay          // present when editing
  nextOrder: number          // order for newly created days (append at end)
  onSave: (data: DayFormData) => void
  onDelete?: () => void
  onClose: () => void
  saving: boolean
}) {
  const [label, setLabel] = useState(day?.label ?? '')
  const [date, setDate] = useState(day?.date ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const valid = label.trim().length > 0 && date.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSave({ label: label.trim(), date, order: day?.order ?? nextOrder })
  }

  const inputCls =
    'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-xs sm:mx-4 flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">{day ? 'Edit Day' : 'Add Day'}</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 -m-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Label *</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "Wedding Day", "Rehearsal Dinner"'
              autoFocus
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex items-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {day && onDelete && (
            confirmDelete ? (
              <span className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-stone-600">Delete day & its events?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-xs text-white bg-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-stone-500 px-2 py-1.5 rounded-lg hover:bg-stone-100"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-rose-500 transition-colors mr-auto py-1.5"
              >
                <Trash2 size={12} /> Delete day
              </button>
            )
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 ml-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || saving}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : day ? 'Save' : 'Add day'}
          </button>
        </div>
      </form>
    </div>
  )
}
