import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Users, UserCheck, UserX, LayoutGrid } from 'lucide-react'
import type { GuestSeating, SeatingTable } from './types'
import { GuestChip } from './GuestChip'
import { TableForm } from './TableForm'
import type { TableFormData } from './types'
import { useCreateTable, useUpdateGuestColor } from './api'

const PALETTE = [
  '#f43f5e', '#ec4899', '#a855f7', '#8b5cf6',
  '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6',
  '#22c55e', '#84cc16', '#f59e0b', '#f97316',
]

interface ColorPickerProps {
  current: string
  anchorRef: React.RefObject<HTMLElement | null>
  onSelect: (color: string) => void
  onClose: () => void
}

function ColorPicker({ current, anchorRef, onSelect, onClose }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [anchorRef, onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 z-50 mt-1 rounded-xl border border-stone-200 bg-white p-2 shadow-xl"
      style={{ top: '100%' }}
    >
      <div className="mb-1.5 grid grid-cols-6 gap-1.5">
        {PALETTE.map((color) => (
          <button
            key={color}
            onClick={() => { onSelect(color); onClose() }}
            className="h-6 w-6 rounded-full transition-transform hover:scale-125"
            style={{
              backgroundColor: color,
              boxShadow: color === current ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
            }}
          />
        ))}
      </div>
      {current && (
        <button
          onClick={() => { onSelect(''); onClose() }}
          className="mt-0.5 w-full rounded-lg border border-stone-200 py-1 text-xs text-stone-500 hover:bg-stone-50"
        >
          Remove color
        </button>
      )}
    </div>
  )
}

interface Props {
  guests: GuestSeating[]
  tables: SeatingTable[]
}

export function GuestSidebar({ guests, tables }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'unassigned' | 'all'>('unassigned')
  const [colorPickerGuestId, setColorPickerGuestId] = useState<number | null>(null)
  const colorAnchorRefs = useRef<Map<number, HTMLElement>>(new Map())

  const createTable = useCreateTable()
  const updateColor = useUpdateGuestColor()

  const unassigned = guests.filter((g) => g.seating_table_id === null)
  const totalSeated = guests.filter((g) => g.seating_table_id !== null).length

  const displayGuests = filter === 'unassigned' ? unassigned : guests
  const filtered = displayGuests.filter((g) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      g.first_name.toLowerCase().includes(q) ||
      g.last_name.toLowerCase().includes(q)
    )
  })

  function handleCreateTable(data: TableFormData) {
    createTable.mutate(data)
    setShowForm(false)
  }

  function handleColorClick(guestId: number, el: HTMLElement) {
    colorAnchorRefs.current.set(guestId, el)
    setColorPickerGuestId((prev) => (prev === guestId ? null : guestId))
  }

  const seatedPct = guests.length > 0 ? Math.round((totalSeated / guests.length) * 100) : 0
  const activeGuest = colorPickerGuestId !== null ? guests.find((g) => g.id === colorPickerGuestId) : null

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col gap-3 overflow-hidden">
      {/* Stats bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Seating Progress</span>
          <span className="text-xs font-bold text-rose-600">{seatedPct}%</span>
        </div>
        <div className="mb-3 h-1.5 w-full rounded-full bg-stone-100">
          <div
            className="h-1.5 rounded-full bg-rose-400 transition-all duration-500"
            style={{ width: `${seatedPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="flex items-center justify-center gap-1">
              <Users size={11} className="text-stone-400" />
              <span className="text-sm font-semibold text-stone-800">{guests.length}</span>
            </div>
            <p className="text-xs text-stone-400">Total</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <UserCheck size={11} className="text-green-500" />
              <span className="text-sm font-semibold text-stone-800">{totalSeated}</span>
            </div>
            <p className="text-xs text-stone-400">Seated</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <UserX size={11} className="text-amber-500" />
              <span className="text-sm font-semibold text-stone-800">{unassigned.length}</span>
            </div>
            <p className="text-xs text-stone-400">Unseated</p>
          </div>
        </div>
      </div>

      {/* Tables count + add */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        {showForm ? (
          <div className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">New Table</p>
            <TableForm onSubmit={handleCreateTable} onCancel={() => setShowForm(false)} />
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-1.5 text-sm text-stone-600">
              <LayoutGrid size={13} className="text-stone-400" />
              <span className="font-medium">{tables.length}</span>
              <span className="text-stone-400">{tables.length === 1 ? 'table' : 'tables'}</span>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <Plus size={13} />
              Add Table
            </button>
          </div>
        )}
      </div>

      {/* Guest list */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        {/* Search */}
        <div className="border-b border-stone-100 p-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guests..."
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-7 pr-3 text-sm placeholder:text-stone-400 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-200"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-stone-100">
          <button
            onClick={() => setFilter('unassigned')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              filter === 'unassigned'
                ? 'border-b-2 border-rose-500 text-rose-600'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Unassigned
            {unassigned.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                filter === 'unassigned' ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-500'
              }`}>
                {unassigned.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'border-b-2 border-rose-500 text-rose-600'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            All guests
          </button>
        </div>

        {/* Guest list */}
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              {search ? (
                <p className="text-sm text-stone-400">No guests match "{search}"</p>
              ) : filter === 'unassigned' ? (
                <p className="text-sm text-green-600 font-medium">All guests seated!</p>
              ) : (
                <p className="text-sm text-stone-400">No guests yet</p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((guest) => {
                const table = guest.seating_table_id
                  ? tables.find((t) => t.id === guest.seating_table_id)
                  : null
                return (
                  <div key={guest.id} className="relative">
                    <GuestChip
                      guest={guest}
                      row
                      onColorClick={(e) => handleColorClick(guest.id, e.currentTarget as HTMLElement)}
                    />
                    {table && filter === 'all' && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
                        {table.name}
                      </span>
                    )}
                    {colorPickerGuestId === guest.id && activeGuest && (
                      <ColorPicker
                        current={guest.seat_color}
                        anchorRef={{ current: colorAnchorRefs.current.get(guest.id) ?? null }}
                        onSelect={(color) => updateColor.mutate({ guestId: guest.id, color })}
                        onClose={() => setColorPickerGuestId(null)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-stone-100 px-3 py-2">
          <p className="text-xs text-stone-400">Drag guests onto tables · Click avatar to set color</p>
        </div>
      </div>
    </aside>
  )
}
