import { useEffect, useRef, useState } from 'react'
import { X, Minus, Pencil, Trash2 } from 'lucide-react'
import type { SeatingTable, TableFormData } from './types'
import { useAssignGuest, useDeleteTable, useUpdateTable } from './api'
import { TableForm } from './TableForm'

interface Props {
  table: SeatingTable
  onClose: () => void
}

export function TablePopup({ table, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const assignGuest = useAssignGuest()
  const deleteTable = useDeleteTable()
  const updateTable = useUpdateTable()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleRemove(guestId: number) {
    assignGuest.mutate({ guestId, tableId: null })
  }

  function handleDelete() {
    if (!confirm(`Delete table "${table.name}"? Guests will be unassigned.`)) return
    deleteTable.mutate(table.id)
    onClose()
  }

  function handleEdit(data: TableFormData) {
    updateTable.mutate({ id: table.id, data })
    setEditing(false)
  }

  const fill = table.assigned_count >= table.capacity ? 'text-amber-600' : 'text-green-600'

  return (
    <div
      ref={ref}
      className="absolute z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-2xl"
      style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="font-semibold text-gray-900">{table.name}</p>
          <p className={`text-xs font-medium ${fill}`}>
            {table.assigned_count} / {table.capacity} seats
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="p-4">
          <TableForm
            initialValues={table}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
            submitLabel="Save"
          />
        </div>
      ) : (
        <>
          {/* Guest list */}
          <div className="max-h-52 overflow-y-auto px-4 py-2">
            {table.guests.length === 0 ? (
              <p className="py-3 text-center text-sm text-gray-400">No guests seated here yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {table.guests.map((g) => (
                  <li key={g.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">
                      {g.first_name} {g.last_name}
                      {g.is_child && <span className="ml-1 text-xs text-gray-400">(child)</span>}
                    </span>
                    <button
                      onClick={() => handleRemove(g.id)}
                      className="ml-2 rounded-full p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Minus size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {table.notes && (
            <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">{table.notes}</p>
          )}

          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-400">Drag guests from the sidebar to add them.</p>
          </div>
        </>
      )}
    </div>
  )
}
