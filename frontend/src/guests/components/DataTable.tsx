import { useRef, useState } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  type ColumnDef, type SortingState, type VisibilityState,
} from '@tanstack/react-table'
import { ArrowUp, ArrowDown, ChevronsUpDown, Pencil, Settings2 } from 'lucide-react'
import { useClickOutside } from '../hooks/useClickOutside'

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp size={11} className="text-stone-600" />
  if (sorted === 'desc') return <ArrowDown size={11} className="text-stone-600" />
  return <ChevronsUpDown size={11} className="text-stone-300" />
}

/**
 * Sortable table with a column-visibility picker.
 * Horizontal scrolling on small screens; rows are tap targets when
 * `onRowClick` is provided (a trailing edit affordance is added).
 */
export function DataTable<T>({
  data, columns, columnLabels, defaultVisibility, onRowClick, emptyMessage = 'No rows match.',
}: {
  data: T[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  columnLabels: Record<string, string>
  defaultVisibility?: VisibilityState
  onRowClick?: (row: T) => void
  emptyMessage?: string
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultVisibility ?? {})
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)

  useClickOutside(colPickerRef, () => setShowColPicker(false), showColPicker)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (data.length === 0) {
    return <div className="text-center py-16 text-stone-400 text-sm">{emptyMessage}</div>
  }

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="flex justify-end px-3 py-2 border-b border-stone-100">
        <div className="relative" ref={colPickerRef}>
          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Settings2 size={12} /> Columns
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-stone-200 rounded-lg shadow-lg p-2 min-w-[140px]">
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-stone-50 rounded cursor-pointer text-xs text-stone-700">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    className="w-3 h-3 rounded"
                  />
                  {columnLabels[col.id] ?? col.id}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-stone-50 border-b border-stone-200">
                {hg.headers.map((header) => (
                  <th key={header.id} className="text-left px-3 py-3 text-stone-500 font-medium whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-stone-800 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon sorted={header.column.getIsSorted()} />
                      </button>
                    )}
                  </th>
                ))}
                {onRowClick && <th className="px-3 py-3 w-10" />}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-stone-50">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? 'hover:bg-stone-50/60 cursor-pointer transition-colors' : ''}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 max-w-[220px] truncate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                {onRowClick && (
                  <td className="px-3 py-2.5">
                    <Pencil size={11} className="text-stone-300" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
