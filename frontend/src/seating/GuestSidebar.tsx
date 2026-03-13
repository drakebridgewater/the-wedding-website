import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { GuestSeating, SeatingTable } from './types'
import { GuestChip } from './GuestChip'
import { TableForm } from './TableForm'
import type { TableFormData } from './types'
import { useCreateTable } from './api'

interface Props {
  guests: GuestSeating[]
  tables: SeatingTable[]
}

export function GuestSidebar({ guests, tables }: Props) {
  const [showForm, setShowForm] = useState(false)
  const createTable = useCreateTable()

  const unassigned = guests.filter((g) => g.seating_table_id === null)
  const totalSeated = guests.filter((g) => g.seating_table_id !== null).length

  function handleCreateTable(data: TableFormData) {
    createTable.mutate(data)
    setShowForm(false)
  }

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col gap-4">
      {/* Stats */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Overview</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total attending</span>
            <span className="font-medium">{guests.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Seated</span>
            <span className="font-medium text-green-600">{totalSeated}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Unassigned</span>
            <span className="font-medium text-amber-600">{unassigned.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tables</span>
            <span className="font-medium">{tables.length}</span>
          </div>
        </div>
      </div>

      {/* Add table */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {showForm ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">New Table</p>
            <TableForm
              onSubmit={handleCreateTable}
              onCancel={() => setShowForm(false)}
            />
          </>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rose-300 py-2.5 text-sm font-medium text-rose-600 hover:border-rose-400 hover:bg-rose-50 transition-colors"
          >
            <Plus size={16} />
            Add Table
          </button>
        )}
      </div>

      {/* Unassigned guests */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Unassigned Guests
            {unassigned.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">
                {unassigned.length}
              </span>
            )}
          </p>
        </div>
        <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          {unassigned.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">All guests seated!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unassigned.map((guest) => (
                <GuestChip key={guest.id} guest={guest} />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
