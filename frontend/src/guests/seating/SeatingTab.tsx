import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { Eye, EyeOff, GripVertical, HelpCircle, Plus } from 'lucide-react'
import {
  useAssignGuestToTable, useBatchAssignGuests,
  useCreateSeatingTable, useDeleteSeatingTable,
  useSeatingGuests, useSeatingTables, useUpdateSeatingTable,
} from '../api'
import type { SeatingGuest, SeatingTable, TableFormData } from '../types'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { groupByParty, type DragData, type DropTarget, type PartyGroup } from './dnd'
import { UnseatedPanel } from './UnseatedPanel'
import { TableCard } from './TableCard'
import { TableFormModal } from './TableFormModal'
import { TablePickerSheet } from './TablePickerSheet'
import { AddGuestsSheet } from './AddGuestsSheet'
import { SeatingHelp } from './SeatingHelp'

/** What the table-picker sheet is currently seating: one guest or a whole party. */
interface SeatTarget {
  guestIds: number[]
  label: string
  currentTableId: number | null
  seatsNeeded: number
}

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

export function SeatingTab({
  onOpenGuest,
}: {
  onOpenGuest?: (partyId: number, guestId?: number) => void
}) {
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
  const [seatTarget,       setSeatTarget]       = useState<SeatTarget | null>(null)
  const [addToTable,       setAddToTable]       = useState<SeatingTable | null>(null)
  const [hideFull,         setHideFull]         = useState(false)
  const [showHelp,         setShowHelp]         = useState(false)

  // Mouse-only: drag is a desktop affordance. On touch screens drag is disabled —
  // use the Seat / Move / Add guests buttons instead (less fiddly on a phone).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
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

  /** Toast (but still allow) when an assignment pushes a table over capacity. */
  function warnIfOverCapacity(tableId: number, addingCount: number) {
    const table = tables.find((t) => t.id === tableId)
    if (!table) return
    const currentCount = getAssignedGuests(tableId).length
    if (currentCount + addingCount > table.capacity) {
      toast.warning(`"${table.name}" is over capacity`, {
        description: `${currentCount + addingCount} assigned, capacity is ${table.capacity}. Assignment saved.`,
      })
    }
  }

  /** Shared by drag-drop, the table-picker sheet, and the add-guests sheet. */
  async function assignGuestsToTable(guestIds: number[], tableId: number | null, plusOneCount = 0) {
    if (tableId !== null) {
      const adding = guestIds.filter((id) => {
        const g = seatingGuests.find((g) => g.id === id)
        return g?.seating_table_id !== tableId
      }).length + plusOneCount
      warnIfOverCapacity(tableId, adding)
    }
    try {
      if (guestIds.length === 1) {
        await assignGuest.mutateAsync({ guestId: guestIds[0], tableId })
      } else {
        await batchAssign.mutateAsync({ guestIds, tableId })
      }
    } catch {
      toast.error('Failed to update seating')
    }
  }

  function openSeatSheetForGuest(guest: SeatingGuest) {
    setSeatTarget({
      guestIds: [guest.id],
      label: `Seat ${guest.first_name} ${guest.last_name}`.trim(),
      currentTableId: guest.seating_table_id,
      seatsNeeded: 1,
    })
  }

  function openSeatSheetForParty(group: PartyGroup) {
    setSeatTarget({
      guestIds: group.guests.map((g) => g.id),
      label: `Seat ${group.partyName} (${group.guests.length + group.plusOneCount})`,
      currentTableId: null,
      seatsNeeded: group.guests.length + group.plusOneCount,
    })
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

    const guestIds = drag.type === 'guest' ? [drag.guestId] : drag.guestIds
    const plusOnes = drag.type === 'party' ? drag.plusOneCount : 0
    await assignGuestsToTable(guestIds, tableId, plusOnes)
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
  const fullTableCount = tables.filter((t) => getAssignedGuests(t.id).length >= t.capacity).length
  const visibleTables = hideFull
    ? tables.filter((t) => getAssignedGuests(t.id).length < t.capacity)
    : tables

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
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Confirmed</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" /> Pending</span>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              title="How seating works"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            >
              <HelpCircle size={13} /> How it works
            </button>
          </div>
        </div>

        {/* One-line description */}
        <p className="-mt-2 text-xs text-stone-400">
          Open a table and type a name to seat guests (or drag them from Unseated). Seat one person, a whole party, or tick several at once.
        </p>

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
              onOpenGuest={onOpenGuest}
              onSeat={openSeatSheetForGuest}
              onSeatParty={openSeatSheetForParty}
            />
          </div>

          {/* Tables */}
          <div className="flex-1 min-w-0 lg:overflow-y-auto">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Tables ({hideFull && fullTableCount > 0 ? `${visibleTables.length} of ${tables.length}` : tables.length})
              </h3>
              <div className="flex items-center gap-2">
                {fullTableCount > 0 && (
                  <button
                    onClick={() => setHideFull((v) => !v)}
                    title={hideFull ? 'Show full tables' : 'Hide tables that are at capacity'}
                    className="flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                  >
                    {hideFull ? <Eye size={12} /> : <EyeOff size={12} />}
                    {hideFull ? `Show full (${fullTableCount})` : `Hide full (${fullTableCount})`}
                  </button>
                )}
                <Button variant="primary" size="sm" onClick={() => { setEditingTable(null); setShowTableModal(true) }}>
                  <Plus size={12} /> Add Table
                </Button>
              </div>
            </div>

            {tables.length === 0 ? (
              <EmptyState
                message="No tables yet."
                actionLabel="Add the first one →"
                onAction={() => setShowTableModal(true)}
              />
            ) : visibleTables.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400">
                All tables are full.{' '}
                <button onClick={() => setHideFull(false)} className="text-rose-600 underline hover:text-rose-700">
                  Show full tables
                </button>
              </p>
            ) : (
              <div className="space-y-2">
                {visibleTables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    assignedGuests={getAssignedGuests(table.id)}
                    collapsed={collapsedTables.has(table.id)}
                    onToggle={() => toggleTable(table.id)}
                    onEdit={() => { setEditingTable(table); setShowTableModal(true) }}
                    onDelete={() => setPendingDeleteTable(table)}
                    onOpenGuest={onOpenGuest}
                    onSeat={openSeatSheetForGuest}
                    onRemove={(g) => assignGuestsToTable([g.id], null)}
                    onAddGuests={() => setAddToTable(table)}
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

      {showHelp && <SeatingHelp onClose={() => setShowHelp(false)} />}
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
      {seatTarget && (
        <TablePickerSheet
          title={seatTarget.label}
          tables={tables}
          currentTableId={seatTarget.currentTableId}
          seatsNeeded={seatTarget.seatsNeeded}
          getAssignedGuests={getAssignedGuests}
          onPick={(tableId) => {
            const target = seatTarget
            setSeatTarget(null)
            assignGuestsToTable(target.guestIds, tableId, target.seatsNeeded - target.guestIds.length)
          }}
          onClose={() => setSeatTarget(null)}
        />
      )}
      {addToTable && (
        <AddGuestsSheet
          table={addToTable}
          groups={unseatedGroups}
          assignedCount={getAssignedGuests(addToTable.id).length}
          // Keep the sheet open so several guests can be seated in a row;
          // the unseated list refreshes after each assignment.
          onAssign={(guestIds) => assignGuestsToTable(guestIds, addToTable.id)}
          onClose={() => setAddToTable(null)}
        />
      )}
    </DndContext>
  )
}
