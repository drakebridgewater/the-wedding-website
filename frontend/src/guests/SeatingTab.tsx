import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import {
  AlertTriangle, ChevronDown, ChevronRight,
  GripVertical, Pencil, Plus, Trash2,
} from 'lucide-react'
import {
  useAssignGuestToTable, useBatchAssignGuests,
  useCreateSeatingTable, useDeleteSeatingTable,
  useSeatingGuests, useSeatingTables, useUpdateSeatingTable,
} from './api'
import type { SeatingGuest, SeatingTable, TableFormData } from './types'

// ── Drag data shapes ──────────────────────────────────────────────────────────

interface DragGuest {
  type: 'guest'
  guestId: number
  currentTableId: number | null
}

interface DragParty {
  type: 'party'
  partyId: number
  guestIds: number[]
  partyName: string
}

type DragData = DragGuest | DragParty
type DropTarget = { type: 'table'; tableId: number } | { type: 'unseated' }

// ── Party grouping helper ─────────────────────────────────────────────────────

interface PartyGroup {
  key: string
  partyId: number | null
  partyName: string
  guests: SeatingGuest[]
}

function groupByParty(guests: SeatingGuest[]): PartyGroup[] {
  const map = new Map<string, PartyGroup>()
  for (const g of guests) {
    const key = g.party_id !== null ? `party-${g.party_id}` : `solo-${g.id}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        partyId: g.party_id,
        partyName: g.party_name ?? `${g.first_name} ${g.last_name}`,
        guests: [],
      })
    }
    map.get(key)!.guests.push(g)
  }
  return Array.from(map.values()).sort((a, b) => a.partyName.localeCompare(b.partyName))
}

// ── Capacity indicator ────────────────────────────────────────────────────────

function CapacityDot({ assigned, capacity }: { assigned: number; capacity: number }) {
  const [color, label] =
    assigned === 0
      ? ['bg-red-400', 'Empty']
      : assigned < capacity
      ? ['bg-amber-400', 'Has room']
      : ['bg-green-500', 'Full']
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} title={label} />
}

// ── Draggable guest chip ──────────────────────────────────────────────────────

function GuestChip({ guest }: { guest: SeatingGuest }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: {
      type: 'guest',
      guestId: guest.id,
      currentTableId: guest.seating_table_id,
    } as DragData,
  })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border border-stone-200 bg-white text-xs text-stone-700 select-none cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : 'hover:border-stone-300'}`}
    >
      <GripVertical size={10} className="text-stone-300 flex-shrink-0" />
      <span className="truncate">
        {guest.first_name} {guest.last_name}
        {guest.is_child && <span className="ml-1 text-stone-400 text-[10px]">child</span>}
      </span>
    </div>
  )
}

// ── Unseated party group ──────────────────────────────────────────────────────

function UnseatedPartyGroup({
  group,
  collapsed,
  onToggle,
}: {
  group: PartyGroup
  collapsed: boolean
  onToggle: () => void
}) {
  const isSingleSolo = group.partyId === null && group.guests.length === 1

  // Party-level drag (only for multi-guest parties)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `party-${group.key}`,
    disabled: isSingleSolo,
    data: {
      type: 'party',
      partyId: group.partyId ?? -1,
      guestIds: group.guests.map((g) => g.id),
      partyName: group.partyName,
    } as DragData,
  })

  if (isSingleSolo) return <GuestChip guest={group.guests[0]} />

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={`rounded-lg border border-stone-200 bg-white transition-opacity ${isDragging ? 'opacity-30' : ''}`}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        {/* Party drag handle */}
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-stone-300 hover:text-stone-400 p-0.5 flex-shrink-0"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          title="Drag to move whole party"
        >
          <GripVertical size={12} />
        </button>
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 flex-1 min-w-0 text-left"
        >
          {collapsed
            ? <ChevronRight size={11} className="text-stone-400 flex-shrink-0" />
            : <ChevronDown size={11} className="text-stone-400 flex-shrink-0" />}
          <span className="text-xs font-medium text-stone-700 truncate">{group.partyName}</span>
          <span className="ml-auto text-[10px] text-stone-400 flex-shrink-0 pl-1">({group.guests.length})</span>
        </button>
      </div>
      {!collapsed && (
        <div className="px-2 pb-2 flex flex-col gap-1 border-t border-stone-100 pt-1.5">
          {group.guests.map((g) => <GuestChip key={g.id} guest={g} />)}
        </div>
      )}
    </div>
  )
}

// ── Unseated drop zone ────────────────────────────────────────────────────────

function UnseatedPanel({
  groups,
  totalCount,
  collapsedParties,
  onToggleParty,
}: {
  groups: PartyGroup[]
  totalCount: number
  collapsedParties: Set<string>
  onToggleParty: (key: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unseated',
    data: { type: 'unseated' } as DropTarget,
  })

  return (
    <div className="w-64 flex-shrink-0">
      <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
        Unseated ({totalCount})
      </h3>
      <div
        ref={setNodeRef}
        className={`min-h-28 rounded-xl border-2 border-dashed p-2 space-y-1.5 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50/50' : 'border-stone-200 bg-stone-50/50'
        }`}
      >
        {groups.length === 0 ? (
          <p className="text-center text-xs text-stone-300 py-6">All guests seated!</p>
        ) : (
          groups.map((group) => (
            <UnseatedPartyGroup
              key={group.key}
              group={group}
              collapsed={collapsedParties.has(group.key)}
              onToggle={() => onToggleParty(group.key)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Table card ────────────────────────────────────────────────────────────────

function TableCard({
  table,
  assignedGuests,
  collapsed,
  onToggle,
  onEdit,
  onDelete,
}: {
  table: SeatingTable
  assignedGuests: SeatingGuest[]
  collapsed: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id } as DropTarget,
  })

  const assigned = assignedGuests.length
  const overCapacity = assigned > table.capacity

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-50/30 shadow-sm'
          : overCapacity
          ? 'border-red-200 bg-white'
          : 'border-stone-200 bg-white'
      }`}
    >
      {/* Header row: [chevron] Name — capacity/max — dot  [edit] [delete] */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-stone-50/70 rounded-xl select-none"
        onClick={onToggle}
      >
        {collapsed
          ? <ChevronRight size={13} className="text-stone-400 flex-shrink-0" />
          : <ChevronDown size={13} className="text-stone-400 flex-shrink-0" />}
        <span className="text-sm font-medium text-stone-800 flex-1 truncate">{table.name}</span>
        <span className="text-xs text-stone-400 tabular-nums flex-shrink-0">
          {assigned}/{table.capacity}
        </span>
        <CapacityDot assigned={assigned} capacity={table.capacity} />
        {overCapacity && (
          <span title="Over capacity" className="flex-shrink-0">
            <AlertTriangle size={11} className="text-red-400" />
          </span>
        )}
        <div className="flex gap-0.5 ml-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3">
          {table.notes && (
            <p className="text-xs text-stone-400 italic mb-2 border-t border-stone-100 pt-2">{table.notes}</p>
          )}
          {assignedGuests.length === 0 ? (
            <p className="text-xs text-stone-300 italic text-center py-3">Drop guests here</p>
          ) : (
            <div className="flex flex-col gap-1 border-t border-stone-100 pt-2">
              {assignedGuests.map((g) => <GuestChip key={g.id} guest={g} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Table form modal ──────────────────────────────────────────────────────────

function TableFormModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: SeatingTable
  onSave: (data: TableFormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<TableFormData>({
    name:     initial?.name     ?? '',
    capacity: initial?.capacity ?? 8,
    shape:    initial?.shape    ?? 'round',
    notes:    initial?.notes    ?? '',
  })

  function set<K extends keyof TableFormData>(k: K, v: TableFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">{initial ? 'Edit Table' : 'Add Table'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Table name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Table 1, Head Table, Family Table"
              autoFocus
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Capacity</label>
            <input
              type="number"
              min={1}
              max={200}
              value={form.capacity}
              onChange={(e) => set('capacity', parseInt(e.target.value, 10) || 8)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Shape</label>
            <select
              value={form.shape}
              onChange={(e) => set('shape', e.target.value as 'round' | 'square')}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              <option value="round">Round</option>
              <option value="square">Square / Rectangular</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Special notes about this table…"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">
            Cancel
          </button>
          <button
            disabled={!form.name || saving}
            onClick={() => form.name && onSave(form)}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add table'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Drag overlay content ──────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export function SeatingTab() {
  const { data: tables = [], isLoading: tablesLoading } = useSeatingTables()
  const { data: seatingGuests = [], isLoading: guestsLoading } = useSeatingGuests()
  const assignGuest    = useAssignGuestToTable()
  const batchAssign    = useBatchAssignGuests()
  const createTable    = useCreateSeatingTable()
  const updateTable    = useUpdateSeatingTable()
  const deleteTable    = useDeleteSeatingTable()

  const [collapsedTables,  setCollapsedTables]  = useState<Set<number>>(new Set())
  const [collapsedParties, setCollapsedParties] = useState<Set<string>>(new Set())
  const [showTableModal,   setShowTableModal]   = useState(false)
  const [editingTable,     setEditingTable]     = useState<SeatingTable | null>(null)
  const [activeDrag,       setActiveDrag]       = useState<DragData | null>(null)

  const unseated       = seatingGuests.filter((g) => g.seating_table_id === null)
  const unseatedGroups = groupByParty(unseated)

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
              }).length
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
    const table = tables.find((t) => t.id === id)
    if (!confirm(`Delete "${table?.name}"? Guests will be unassigned.`)) return
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
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span>{seatingGuests.length} attending</span>
          <span>·</span>
          <span>{totalSeated} seated</span>
          <span>·</span>
          <span className={unseated.length > 0 ? 'text-amber-500' : 'text-green-600'}>
            {unseated.length} unseated
          </span>
          <span>·</span>
          <span>{tables.length} tables</span>
          <div className="ml-auto flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Empty</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Has room</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Full</span>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">
          {/* Left: unseated */}
          <UnseatedPanel
            groups={unseatedGroups}
            totalCount={unseated.length}
            collapsedParties={collapsedParties}
            onToggleParty={toggleParty}
          />

          {/* Right: tables */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Tables ({tables.length})
              </h3>
              <button
                onClick={() => { setEditingTable(null); setShowTableModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs hover:bg-stone-700 transition-colors"
              >
                <Plus size={12} /> Add Table
              </button>
            </div>

            {tables.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <p className="text-sm">No tables yet.</p>
                <button
                  onClick={() => setShowTableModal(true)}
                  className="mt-3 text-sm text-rose-600 hover:underline"
                >
                  Add the first one →
                </button>
              </div>
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
                    onDelete={() => handleDeleteTable(table.id)}
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
    </DndContext>
  )
}
