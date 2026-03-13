import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Settings, Loader2 } from 'lucide-react'
import { useSeatingConfig, useTables, useGuests, useUpdateTable, useAssignGuest } from './api'
import { SeatingGrid } from './SeatingGrid'
import { GuestSidebar } from './GuestSidebar'
import { SettingsPanel } from './SettingsPanel'
import { CELL_SIZE } from './TableBlock'

export function SeatingChartApp() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [overTableId, setOverTableId] = useState<number | null>(null)

  const configQuery = useSeatingConfig()
  const tablesQuery = useTables()
  const guestsQuery = useGuests()
  const updateTable = useUpdateTable()
  const assignGuest = useAssignGuest()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const isLoading = configQuery.isLoading || tablesQuery.isLoading || guestsQuery.isLoading
  const hasError = configQuery.isError || tablesQuery.isError || guestsQuery.isError

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-rose-400" size={32} />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex h-96 items-center justify-center text-red-500">
        Failed to load seating chart. Please refresh.
      </div>
    )
  }

  const config = configQuery.data!
  const tables = tablesQuery.data!
  const guests = guestsQuery.data!

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (over?.data.current?.type === 'table') {
      setOverTableId(over.data.current.tableId as number)
    } else {
      setOverTableId(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setOverTableId(null)
    const { active, over, delta } = event

    const activeType = active.data.current?.type

    // Guest dropped onto a table
    if (activeType === 'guest' && over?.data.current?.type === 'table') {
      const guestId = active.data.current!.guest.id as number
      const tableId = over.data.current!.tableId as number
      assignGuest.mutate({ guestId, tableId })
      return
    }

    // Table repositioned by dragging
    if (activeType === 'table-move') {
      const tableId = active.data.current!.tableId as number
      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      const newX = Math.max(0, Math.round((table.grid_x * CELL_SIZE + delta.x) / CELL_SIZE))
      const newY = Math.max(0, Math.round((table.grid_y * CELL_SIZE + delta.y) / CELL_SIZE))
      const clampedX = Math.min(newX, config.grid_cols - table.grid_width)
      const clampedY = Math.min(newY, config.grid_rows - table.grid_height)

      if (clampedX !== table.grid_x || clampedY !== table.grid_y) {
        updateTable.mutate({ id: tableId, data: { grid_x: clampedX, grid_y: clampedY } })
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Seating Chart</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Drag guests from the sidebar onto tables. Drag tables to reposition them.
          </p>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <Settings size={15} />
          Grid Settings
        </button>
      </div>

      <DndContext sensors={sensors} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            <SeatingGrid config={config} tables={tables} overTableId={overTableId} />
          </div>
          <GuestSidebar guests={guests} tables={tables} />
        </div>
      </DndContext>

      {settingsOpen && (
        <SettingsPanel config={config} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
