import { useState } from 'react'
import { Toaster, toast } from 'sonner'
import { useDays, useMembers, useGroups, useCreateEvent, useUpdateEvent, useDeleteEvent } from './api'
import { DayTabs } from './DayTabs'
import { Timeline } from './Timeline'
import { EventFormModal } from './EventFormModal'
import type { EventFormData, MemberRole, ScheduleEvent } from './types'

type RoleFilter = MemberRole | 'all'

const ROLE_LABELS: Record<RoleFilter, string> = {
  all:          'All',
  bride:        'Bride',
  groom:        'Groom',
  maid_of_honor: 'Maid of Honor',
  best_man:     'Best Man',
  bridesmaid:   'Bridesmaids',
  groomsman:    'Groomsmen',
  other:        'Other',
}

const ROLE_ORDER: RoleFilter[] = [
  'all', 'bride', 'groom', 'maid_of_honor', 'best_man', 'bridesmaid', 'groomsman', 'other',
]

export function ScheduleApp() {
  const { data: days = [], isLoading: daysLoading } = useDays()
  const { data: members = [] } = useMembers()
  const { data: groups = [] } = useGroups()

  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)
  const [modalTime, setModalTime] = useState<string | undefined>()
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('all')

  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const activeDayId = selectedDayId ?? days[0]?.id ?? null
  const activeDay = days.find((d) => d.id === activeDayId)

  // Roles that actually have at least one member
  const presentRoles = new Set(members.map((m) => m.role))
  const visibleRoles = ROLE_ORDER.filter((r) => r === 'all' || presentRoles.has(r as MemberRole))

  // Filter events: if a role is selected, show events where that role is an attendee
  // Events with no attendees are always shown (they're whole-group events)
  const filteredEvents: ScheduleEvent[] = (activeDay?.events ?? []).filter((ev) => {
    if (selectedRole === 'all') return true
    if (ev.attendees.length === 0) return true
    return ev.attendees.some((a) => a.role === selectedRole)
  })

  function openAddModal(time: string) {
    setEditingEvent(undefined)
    setModalTime(time)
    setShowModal(true)
  }

  function openEditModal(event: ScheduleEvent) {
    setEditingEvent(event)
    setModalTime(undefined)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingEvent(undefined)
    setModalTime(undefined)
  }

  async function handleSave(data: EventFormData) {
    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({ id: editingEvent.id, data })
        toast.success('Event updated')
      } else {
        await createEvent.mutateAsync(data)
        toast.success('Event added')
      }
      closeModal()
    } catch {
      toast.error('Failed to save event')
    }
  }

  async function handleDelete() {
    if (!editingEvent) return
    try {
      await deleteEvent.mutateAsync(editingEvent.id)
      toast.success('Event deleted')
      closeModal()
    } catch {
      toast.error('Failed to delete event')
    }
  }

  if (daysLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 text-sm">
        Loading schedule…
      </div>
    )
  }

  if (days.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center px-4">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">No schedule days yet</h2>
        <p className="text-sm text-stone-500">
          Add schedule days in the{' '}
          <a href="/admin/schedule/scheduleday/add/" className="text-rose-600 underline">
            Django admin
          </a>{' '}
          to get started.
        </p>
      </div>
    )
  }

  const conflictCount = activeDay?.events.reduce(
    (n, e) => n + (e.conflicts.length > 0 ? 1 : 0),
    0,
  ) ?? 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Toaster richColors position="top-right" />

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Day-of Schedule</h1>
          {conflictCount > 0 ? (
            <p className="text-xs text-amber-600 mt-0.5">
              ⚠ {conflictCount} scheduling conflict{conflictCount > 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-xs text-stone-400 mt-0.5">Plan every moment — from getting ready to the last dance.</p>
          )}
        </div>
        <p className="text-xs text-stone-400 hidden sm:block">Click the timeline to add an event</p>
      </div>

      {/* Day tabs */}
      <DayTabs
        days={days}
        selectedId={activeDayId}
        onSelect={(id) => {
          setSelectedDayId(id)
          setSelectedRole('all')
        }}
      />

      {/* Role filter chips */}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
          {visibleRoles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                selectedRole === role
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700'
              }`}
            >
              {ROLE_LABELS[role]}
              {role !== 'all' && activeDay && (
                <span className={`ml-1 text-[10px] ${selectedRole === role ? 'opacity-70' : 'text-stone-400'}`}>
                  {activeDay.events.filter(
                    (ev) => ev.attendees.length === 0 || ev.attendees.some((a) => a.role === role),
                  ).length}
                </span>
              )}
            </button>
          ))}
          {selectedRole !== 'all' && (
            <span className="flex items-center text-[11px] text-stone-400 ml-1">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Timeline */}
      {activeDay && (
        <Timeline
          events={filteredEvents}
          onTimeClick={openAddModal}
          onEventClick={openEditModal}
        />
      )}

      {/* Modal */}
      {showModal && activeDayId !== null && (
        <EventFormModal
          dayId={activeDayId}
          members={members}
          groups={groups}
          initialTime={modalTime}
          event={editingEvent}
          onSave={handleSave}
          onDelete={editingEvent ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
