import { useState } from 'react'
import { Toaster, toast } from 'sonner'
import { useDays, useMembers, useCreateEvent, useUpdateEvent, useDeleteEvent } from './api'
import { DayTabs } from './DayTabs'
import { Timeline } from './Timeline'
import { EventFormModal } from './EventFormModal'
import type { EventFormData, ScheduleEvent } from './types'

export function ScheduleApp() {
  const { data: days = [], isLoading: daysLoading } = useDays()
  const { data: members = [] } = useMembers()

  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)
  const [modalTime, setModalTime] = useState<string | undefined>()
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | undefined>()
  const [showModal, setShowModal] = useState(false)

  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  // Auto-select first day once loaded
  const activeDayId = selectedDayId ?? days[0]?.id ?? null
  const activeDay = days.find((d) => d.id === activeDayId)

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
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading schedule…
      </div>
    )
  }

  if (days.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center px-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">No schedule days yet</h2>
        <p className="text-sm text-gray-500">
          Add schedule days in the{' '}
          <a href="/admin/planning/scheduleday/add/" className="text-indigo-600 underline">
            Django admin
          </a>{' '}
          to get started.
        </p>
      </div>
    )
  }

  const conflictCount = activeDay?.events.reduce((n, e) => n + (e.conflicts.length > 0 ? 1 : 0), 0) ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Toaster richColors position="top-right" />

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Day-of Schedule</h1>
          {conflictCount > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              ⚠ {conflictCount} scheduling conflict{conflictCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-400">Click the timeline to add an event</p>
      </div>

      {/* Day tabs */}
      <DayTabs
        days={days}
        selectedId={activeDayId}
        onSelect={(id) => setSelectedDayId(id)}
      />

      {/* Timeline */}
      {activeDay && (
        <Timeline
          events={activeDay.events}
          onTimeClick={openAddModal}
          onEventClick={openEditModal}
        />
      )}

      {/* Modal */}
      {showModal && activeDayId !== null && (
        <EventFormModal
          dayId={activeDayId}
          members={members}
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
