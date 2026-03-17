import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { EventCategory, EventFormData, ScheduleEvent, WeddingPartyGroup, WeddingPartyMember } from './types'
import { CATEGORY_LABELS } from './types'

interface Props {
  dayId: number
  members: WeddingPartyMember[]
  groups?: WeddingPartyGroup[]
  initialTime?: string     // "HH:MM"
  event?: ScheduleEvent    // present when editing
  onSave: (data: EventFormData) => void
  onDelete?: () => void
  onClose: () => void
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360]

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// Group members by role for display
const ROLE_ORDER = ['bride', 'groom', 'maid_of_honor', 'best_man', 'bridesmaid', 'groomsman', 'other']

export function EventFormModal({ dayId, members, groups = [], initialTime, event, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(event?.name ?? '')
  const [startTime, setStartTime] = useState(
    event ? event.start_time.slice(0, 5) : (initialTime ?? '09:00')
  )
  const [duration, setDuration] = useState(event?.duration_minutes ?? 60)
  const [location, setLocation] = useState(event?.location ?? '')
  const [category, setCategory] = useState<EventCategory>(event?.category ?? 'other')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(event?.attendees.map((a) => a.id) ?? [])
  )
  const [isPublic, setIsPublic] = useState(event?.is_public ?? false)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function toggleMember(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGroup(group: WeddingPartyGroup) {
    const ids = group.members.map((m) => m.id)
    const allSelected = ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      day: dayId,
      start_time: startTime,
      duration_minutes: duration,
      name,
      location,
      category,
      notes,
      is_public: isPublic,
      attendee_ids: Array.from(selectedIds),
    })
  }

  // Group members by role
  const grouped = ROLE_ORDER.reduce<Record<string, WeddingPartyMember[]>>((acc, role) => {
    const group = members.filter((m) => m.role === role)
    if (group.length) acc[role] = group
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">
            {event ? 'Edit Event' : 'Add Event'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form id="event-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Event name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bride hair & makeup"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start time *</label>
              <input
                required
                type="time"
                step={900}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{formatDuration(d)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bridal suite"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Attendees */}
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Who's attending</label>

              {/* Group quick-select */}
              {groups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-gray-100">
                  {groups.map((g) => {
                    const allSelected = g.members.length > 0 && g.members.every((m) => selectedIds.has(m.id))
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGroup(g)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                        style={allSelected
                          ? { backgroundColor: g.color, borderColor: g.color, color: '#fff' }
                          : { borderColor: g.color, color: g.color, backgroundColor: `${g.color}15` }
                        }
                        title={g.description || g.name}
                      >
                        {g.name}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="space-y-3">
                {Object.entries(grouped).map(([role, group]) => (
                  <div key={role}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      {group[0].role_display.replace(/^(.+)$/, (_, s) =>
                        // Pluralise role label for the group header
                        group.length > 1 && !s.endsWith('s') ? s + 's' : s
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.map((m) => {
                        const selected = selectedIds.has(m.id)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMember(m.id)}
                            className={`
                              px-3 py-1 rounded-full text-xs font-medium border transition-colors
                              ${selected
                                ? 'text-white border-transparent'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}
                            `}
                            style={selected ? { backgroundColor: m.color, borderColor: m.color } : {}}
                          >
                            {m.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public program toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            <span className="text-sm text-gray-700">Show on public program</span>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between gap-3">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="event-form"
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              {event ? 'Save changes' : 'Add event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
