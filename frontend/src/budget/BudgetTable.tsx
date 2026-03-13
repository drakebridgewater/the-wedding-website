import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown,
  Check, ChevronRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExpenseRows } from './ExpenseRows'
import type { BudgetItem } from './api'

const col = createColumnHelper<BudgetItem>()

interface Props {
  items: BudgetItem[]
  onEdit: (item: BudgetItem) => void
  onDelete: (id: number) => void
  isDeleting: boolean
}

export function BudgetTable({ items, onEdit, onDelete, isDeleting }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const columns = [
    // Expand toggle
    col.display({
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        const hasExpenses = row.original.expenses.length > 0
        const isOpen = expanded.has(row.original.id)
        return (
          <button
            onClick={() => toggleExpand(row.original.id)}
            className={`p-1 rounded transition-colors ${
              isOpen
                ? 'text-rose-600'
                : hasExpenses
                ? 'text-gray-500 hover:text-rose-600'
                : 'text-gray-200 hover:text-gray-400'
            }`}
            title={isOpen ? 'Collapse expenses' : 'Expand expenses'}
          >
            <ChevronRight
              size={15}
              className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
            />
          </button>
        )
      },
    }),
    col.accessor('category_display', {
      header: 'Category',
      cell: (info) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-rose-50 text-rose-700">
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor('description', { header: 'Description' }),
    col.accessor('vendor_name', {
      header: 'Vendor',
      cell: (info) => info.getValue() ?? <span className="text-gray-300">—</span>,
    }),
    col.accessor('estimated_cost', {
      header: 'Estimated',
      cell: (info) => <span className="font-medium">{formatCurrency(info.getValue())}</span>,
    }),
    col.display({
      id: 'actual',
      header: 'Actual',
      cell: ({ row }) => {
        const expTotal = parseFloat(row.original.expense_total)
        if (expTotal > 0) {
          const count = row.original.expenses.length
          return (
            <span className="font-medium">
              {formatCurrency(expTotal)}
              <span className="ml-1 text-xs text-gray-400">({count})</span>
            </span>
          )
        }
        return row.original.actual_cost ? (
          <span className="font-medium">{formatCurrency(row.original.actual_cost)}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )
      },
    }),
    col.accessor('variance', {
      header: 'Variance',
      cell: (info) => {
        const v = info.getValue()
        if (!v) return <span className="text-gray-300">—</span>
        const num = parseFloat(v)
        const color = num >= 0 ? 'text-emerald-600' : 'text-red-600'
        return <span className={`font-medium ${color}`}>{formatCurrency(Math.abs(num))}</span>
      },
    }),
    col.accessor('is_paid', {
      header: 'Paid',
      cell: (info) =>
        info.getValue() ? (
          <Check size={18} className="text-emerald-500 mx-auto" />
        ) : (
          <span className="text-gray-300 block text-center">—</span>
        ),
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => onEdit(row.original)}
            className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(row.original.id)}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search items…"
          className="w-64 text-base border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wide">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon state={header.column.getIsSorted()} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                  No budget items yet. Add one above.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      expanded.has(row.original.id) ? 'bg-gray-50' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expanded.has(row.original.id) && (
                    <ExpenseRows key={`exp-${row.original.id}`} item={row.original} />
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2 border-t border-gray-100 text-sm text-gray-400">
        {table.getFilteredRowModel().rows.length} item
        {table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

function SortIcon({ state }: { state: false | 'asc' | 'desc' }) {
  if (state === 'asc') return <ChevronUp size={14} />
  if (state === 'desc') return <ChevronDown size={14} />
  return <ChevronsUpDown size={14} className="opacity-40" />
}
