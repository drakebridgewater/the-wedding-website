import { useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Maximize2, Settings, Loader2, LayoutGrid, LayoutList } from 'lucide-react'
import { useSeatingConfig, useTables, useGuests, useUpdateTable, useAssignGuest } from './api'
import { SeatingGrid, type SeatingGridHandle, type ViewTransform } from './SeatingGrid'
import { GuestSidebar } from './GuestSidebar'
import { SettingsPanel } from './SettingsPanel'
import { TableListView } from './TableListView'
import { CELL_SIZE } from './TableBlock'

export function SeatingChartApp() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [overTableId, setOverTableId] = useState<number | null>(null)
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'grid'
  )
  const gridRef = useRef<SeatingGridHandle>(null)

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
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 70px)' }}>
        <Loader2 className="animate-spin text-rose-400" size={32} />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center text-red-500" style={{ height: 'calc(100vh - 70px)' }}>
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

    if (activeType === 'guest' && over?.data.current?.type === 'table') {
      const guestId = active.data.current!.guest.id as number
      const tableId = over.data.current!.tableId as number
      assignGuest.mutate({ guestId, tableId })
      return
    }

    if (activeType === 'table-move') {
      const tableId = active.data.current!.tableId as number
      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      const scale = viewTransform.scale
      const newX = Math.max(0, Math.round((table.grid_x * CELL_SIZE + delta.x / scale) / CELL_SIZE))
      const newY = Math.max(0, Math.round((table.grid_y * CELL_SIZE + delta.y / scale) / CELL_SIZE))
      const clampedX = Math.min(newX, config.grid_cols - table.grid_width)
      const clampedY = Math.min(newY, config.grid_rows - table.grid_height)

      if (clampedX !== table.grid_x || clampedY !== table.grid_y) {
        updateTable.mutate({ id: tableId, data: { grid_x: clampedX, grid_y: clampedY } })
      }
    }
  }

  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{ height: 'calc(100vh - 70px)' }}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Seating Chart</h1>
          {viewMode === 'grid' && (
            <p className="text-xs text-gray-500 mt-0.5">
              Scroll to zoom · Drag empty space to pan · Drag tables to move · Drag guests onto tables to seat
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                viewMode === 'list' ? 'bg-rose-50 text-rose-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`flex items-center gap-1.5 border-l border-gray-200 px-3 py-2 text-sm transition-colors ${
                viewMode === 'grid' ? 'bg-rose-50 text-rose-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {viewMode === 'grid' && (
            <>
              <button
                onClick={() => gridRef.current?.fitView()}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
                title="Fit to screen"
              >
                <Maximize2 size={14} />
                <span className="hidden sm:inline">Fit</span>
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Grid Settings</span>
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <TableListView tables={tables} guests={guests} />
      ) : (
        <DndContext sensors={sensors} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1 gap-4">
            <SeatingGrid
              ref={gridRef}
              config={config}
              tables={tables}
              overTableId={overTableId}
              transform={viewTransform}
              onTransformChange={setViewTransform}
            />
            <GuestSidebar guests={guests} tables={tables} />
          </div>
        </DndContext>
      )}

      {settingsOpen && (
        <SettingsPanel config={config} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
