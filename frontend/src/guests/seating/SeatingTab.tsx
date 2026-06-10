import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { GripVertical, Plus } from 'lucide-react'
import {
  useAssignGuestToTable, useBatchAssignGuests,
  useCreateSeatingTable, useDeleteSeatingTable,
  useSeatingGuests, useSeatingTables, useUpdateSeatingTable,
} from '../api'
import type { SeatingGuest, SeatingTable, TableFormData } from '../types'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { groupByParty, type DragData, type DropTarget } from './dnd'
import { UnseatedPanel } from './UnseatedPanel'
import { TableCard } from './TableCard'
import { TableFormModal } from './TableFormModal'

function DragOverlayContent({ activeDrag, seatingGuests }: { activeDrag: DragData | null; seatingGuests: SeatingGuest[] }) {
  if (!activeDrag) return null
  if (activeDrag.type === 'guest') {
    const g = seatingGuests.find((g) => g.id === activeDrag.guestId)
    if (!g) return null
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-stone-300 bg-white shadow-lg text-xs text-stone-700 cursor-grabbing">
        <GripVertical size={10} className="text-stone-300" />
        {g.first_name} {g.last_name}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white shadow-lg text-xs text-stone-700 font-medium cursor-grabbing">
      <GripVertical size={10} className="text-stone-300" />
      {activeDrag.partyName} ({activeDrag.guestIds.length})
    </div>
  )
}

export function SeatingTab() {
  const { data: tables = [], isLoading: tablesLoading } = useSeatingTables()
  const { data: seatingGuests = [], isLoading: guestsLoading } = useSeatingGuests()
  const assignGuest = useAssignGuestToTable()
  const batchAssign = useBatchAssignGuests()
  const createTable = useCreateSeatingTable()
  const updateTable = useUpdateSeatingTable()
  const deleteTable = useDeleteSeatingTable()

  const [collapsedTables,  setCollapsedTables]  = useState<Set<number>>(new Set())
  const [collapsedParties, setCollapsedParties] = useState<Set<string>>(new Set())
  const [showTableModal,   setShowTableModal]   = useState(false)
  const [editingTable,     setEditingTable]     = useState<SeatingTable | null>(null)
  const [activeDrag,       setActiveDrag]       = useState<DragData | null>(null)
  const [pendingDeleteTable, setPendingDeleteTable] = useState<SeatingTable | null>(null)

  // Small activation thresholds keep taps/scrolls from starting a drag on touch screens.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const unseated       = seatingGuests.filter((g) => g.seating_table_id === null)
  const unseatedGroups = groupByParty(unseated)
  const unseatedPlusOnes = unseatedGroups.reduce((sum, g) => sum + g.plusOneCount, 0)

  function toggleTable(id: number) {
    setCollapsedTables((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleParty(key: string) {
    setCollapsedParties((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function getAssignedGuests(tableId: number) {
    return seatingGuests.filter((g) => g.seating_table_id === tableId)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag(event.active.data.current as DragData)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return

    const drag = active.data.current as DragData
    const drop = over.data.current as DropTarget
    const tableId = drop.type === 'table' ? drop.tableId : null

    // Skip no-op
    if (drag.type === 'guest' && drag.currentTableId === tableId) return

    // Capacity warning (still saves)
    if (tableId !== null) {
      const table = tables.find((t) => t.id === tableId)
      if (table) {
        const currentCount = getAssignedGuests(tableId).length
        const addingCount =
          drag.type === 'guest'
            ? drag.currentTableId !== tableId ? 1 : 0
            : drag.guestIds.filter((id) => {
                const g = seatingGuests.find((g) => g.id === id)
                return g?.seating_table_id !== tableId
              }).length + drag.plusOneCount
        if (currentCount + addingCount > table.capacity) {
          toast.warning(`"${table.name}" is over capacity`, {
            description: `${currentCount + addingCount} assigned, capacity is ${table.capacity}. Assignment saved.`,
          })
        }
      }
    }

    try {
      if (drag.type === 'guest') {
        await assignGuest.mutateAsync({ guestId: drag.guestId, tableId })
      } else {
        await batchAssign.mutateAsync({ guestIds: drag.guestIds, tableId })
      }
    } catch {
      toast.error('Failed to update seating')
    }
  }

  async function handleSaveTable(data: TableFormData) {
    try {
      if (editingTable) {
        await updateTable.mutateAsync({ id: editingTable.id, data })
        toast.success('Table updated')
      } else {
        await createTable.mutateAsync(data)
        toast.success('Table added')
      }
      setShowTableModal(false)
      setEditingTable(null)
    } catch {
      toast.error('Failed to save table')
    }
  }

  async function handleDeleteTable(id: number) {
    try {
      await deleteTable.mutateAsync(id)
      toast.success('Table deleted')
    } catch {
      toast.error('Failed to delete table')
    }
  }

  if (tablesLoading || guestsLoading) {
    return <div className="text-sm text-stone-400">Loading…</div>
  }

  const totalSeated = seatingGuests.filter((g) => g.seating_table_id !== null).length

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-x-3 gap-y-1 text-xs text-stone-400 flex-wrap">
          <span>{seatingGuests.filter((g) => g.is_attending === true).length} confirmed</span>
          <span>·</span>
          <span>{seatingGuests.filter((g) => g.is_attending === null).length} pending</span>
          <span>·</span>
          <span>{totalSeated} seated</span>
          <span>·</span>
          <span className={unseated.length + unseatedPlusOnes > 0 ? 'text-amber-500' : 'text-green-600'}>
            {unseated.length + unseatedPlusOnes} unseated
          </span>
          <span>·</span>
          <span>{tables.length} tables</span>
          <div className="ml-auto hidden sm:flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Confirmed</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" /> Pending</span>
          </div>
        </div>

        {/*
          Desktop: two independently scrolling columns.
          Mobile: stacked — the unseated panel gets its own capped scroll area
          so tables stay reachable while dragging.
        */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-16rem)]">
          {/* Unseated */}
          <div className="w-full lg:w-64 flex-shrink-0 max-h-[40dvh] lg:max-h-none overflow-y-auto">
            <UnseatedPanel
              groups={unseatedGroups}
              totalCount={unseated.length}
              collapsedParties={collapsedParties}
              onToggleParty={toggleParty}
            />
          </div>

          {/* Tables */}
          <div className="flex-1 min-w-0 lg:overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Tables ({tables.length})
              </h3>
              <Button variant="primary" size="sm" onClick={() => { setEditingTable(null); setShowTableModal(true) }}>
                <Plus size={12} /> Add Table
              </Button>
            </div>

            {tables.length === 0 ? (
              <EmptyState
                message="No tables yet."
                actionLabel="Add the first one →"
                onAction={() => setShowTableModal(true)}
              />
            ) : (
              <div className="space-y-2">
                {tables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    assignedGuests={getAssignedGuests(table.id)}
                    collapsed={collapsedTables.has(table.id)}
                    onToggle={() => toggleTable(table.id)}
                    onEdit={() => { setEditingTable(table); setShowTableModal(true) }}
                    onDelete={() => setPendingDeleteTable(table)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        <DragOverlayContent activeDrag={activeDrag} seatingGuests={seatingGuests} />
      </DragOverlay>

      {showTableModal && (
        <TableFormModal
          initial={editingTable ?? undefined}
          onSave={handleSaveTable}
          onClose={() => { setShowTableModal(false); setEditingTable(null) }}
          saving={createTable.isPending || updateTable.isPending}
        />
      )}
      {pendingDeleteTable && (
        <ConfirmDialog
          title="Delete table"
          message={`Delete "${pendingDeleteTable.name}"? Guests will be unassigned.`}
          onConfirm={() => handleDeleteTable(pendingDeleteTable.id)}
          onClose={() => setPendingDeleteTable(null)}
        />
      )}
    </DndContext>
  )
}
