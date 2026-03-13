import { useState } from 'react'
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { GuestSeating, SeatingTable, TableFormData } from './types'
import { useAssignGuest, useCreateTable, useDeleteTable, useUpdateTable } from './api'
import { TableForm } from './TableForm'

interface Props {
  tables: SeatingTable[]
  guests: GuestSeating[]
}

export function TableListView({ tables, guests }: Props) {
  const [showAddTable, setShowAddTable] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const createTable = useCreateTable()

  const unassigned = guests.filter((g) => g.seating_table_id === null)
  const totalSeated = guests.filter((g) => g.seating_table_id !== null).length

  function handleCreateTable(data: TableFormData) {
    createTable.mutate(data)
    setShowAddTable(false)
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pb-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: guests.length, color: 'text-gray-800' },
          { label: 'Seated', value: totalSeated, color: 'text-green-600' },
          { label: 'Unseated', value: unassigned.length, color: 'text-amber-600' },
          { label: 'Tables', value: tables.length, color: 'text-gray-800' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Add Table */}
      {showAddTable ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">New Table</p>
          <TableForm onSubmit={handleCreateTable} onCancel={() => setShowAddTable(false)} />
        </div>
      ) : (
        <button
          onClick={() => setShowAddTable(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rose-300 py-3 text-sm font-medium text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-50"
        >
          <Plus size={16} />
          Add Table
        </button>
      )}

      {/* Table cards */}
      {tables.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No tables yet. Add one above.</p>
      ) : (
        tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            unassigned={unassigned}
            expanded={expandedId === table.id}
            onToggle={() => setExpandedId(expandedId === table.id ? null : table.id)}
          />
        ))
      )}

      {/* Unassigned guests */}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Unassigned Guests{' '}
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">
                {unassigned.length}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            {unassigned.map((g) => (
              <span key={g.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                {g.first_name} {g.last_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface TableCardProps {
  table: SeatingTable
  unassigned: GuestSeating[]
  expanded: boolean
  onToggle: () => void
}

function TableCard({ table, unassigned, expanded, onToggle }: TableCardProps) {
  const [editing, setEditing] = useState(false)
  const [selectKey, setSelectKey] = useState(0)
  const assignGuest = useAssignGuest()
  const deleteTable = useDeleteTable()
  const updateTable = useUpdateTable()

  const isFull = table.assigned_count >= table.capacity

  function handleDelete() {
    if (!confirm(`Delete table "${table.name}"? Guests will be unassigned.`)) return
    deleteTable.mutate(table.id)
  }

  function handleUpdate(data: TableFormData) {
    updateTable.mutate({ id: table.id, data })
    setEditing(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div
        className="flex cursor-pointer select-none items-center gap-3 px-4 py-3"
        onClick={() => { setEditing(false); onToggle() }}
      >
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-gray-900">{table.name}</p>
          <p className={`text-xs font-medium ${isFull ? 'text-amber-600' : 'text-gray-500'}`}>
            {table.assigned_count}/{table.capacity} seats · {table.shape}
          </p>
        </div>
        {/* Guest name preview (desktop, collapsed only) */}
        {!expanded && table.guests.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1 max-w-xs overflow-hidden">
            {table.guests.slice(0, 3).map((g) => (
              <span
                key={g.id}
                className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs text-rose-700"
              >
                {g.first_name}
              </span>
            ))}
            {table.guests.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                +{table.guests.length - 3}
              </span>
            )}
          </div>
        )}
        {expanded
          ? <ChevronUp size={16} className="flex-shrink-0 text-gray-400" />
          : <ChevronDown size={16} className="flex-shrink-0 text-gray-400" />
        }
      </div>

      {/* Expanded: guest list + actions */}
      {expanded && !editing && (
        <div className="border-t border-gray-100">
          <div className="space-y-1.5 px-4 py-3">
            {table.guests.length === 0 ? (
              <p className="text-sm text-gray-400">No guests seated here yet.</p>
            ) : (
              table.guests.map((g) => (
                <div key={g.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-800">
                    {g.first_name} {g.last_name}
                    {g.is_child && <span className="ml-1 text-xs text-gray-400">(child)</span>}
                  </span>
                  <button
                    onClick={() => assignGuest.mutate({ guestId: g.id, tableId: null })}
                    className="ml-2 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add guest select */}
          {!isFull && unassigned.length > 0 && (
            <div className="border-t border-gray-50 px-4 pb-3">
              <select
                key={selectKey}
                defaultValue=""
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                onChange={(e) => {
                  if (e.target.value) {
                    assignGuest.mutate({ guestId: Number(e.target.value), tableId: table.id })
                    setSelectKey((k) => k + 1)
                  }
                }}
              >
                <option value="" disabled>+ Add a guest…</option>
                {unassigned.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.first_name} {g.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {table.notes && (
            <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">{table.notes}</p>
          )}

          <div className="flex gap-2 border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {expanded && editing && (
        <div className="border-t border-gray-100 p-4">
          <TableForm
            initialValues={table}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitLabel="Save"
          />
        </div>
      )}
    </div>
  )
}
