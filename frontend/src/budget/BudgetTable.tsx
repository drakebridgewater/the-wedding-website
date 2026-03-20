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
  Check, ChevronRight, ChevronDown as ChevronDownIcon,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExpenseRows } from './ExpenseRows'
import { MobileExpensePanel } from './MobileExpensePanel'
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
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-rose-50 text-rose-700 whitespace-nowrap">
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

  const filteredItems = table.getFilteredRowModel().rows.map((r) => r.original)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search items…"
          className="w-full sm:w-64 text-base border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      {/* ── Mobile card list ─────────────────────────────────── */}
      <div className="md:hidden divide-y divide-gray-100">
        {filteredItems.length === 0 ? (
          <p className="px-4 py-10 text-center text-gray-400">No budget items yet. Add one above.</p>
        ) : (
          filteredItems.map((item) => {
            const expTotal = parseFloat(item.expense_total)
            const isOpen = expanded.has(item.id)
            const variance = item.variance ? parseFloat(item.variance) : null

            return (
              <div key={item.id} className="px-4 py-4">
                {/* Category + actions */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 mb-1">
                      {item.category_display}
                    </span>
                    <p className="font-medium text-gray-900 leading-snug">{item.description}</p>
                    {item.vendor_name && (
                      <p className="text-sm text-gray-500 mt-0.5">{item.vendor_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {item.is_paid && <Check size={15} className="text-emerald-500" />}
                    <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => onDelete(item.id)} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Costs */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Estimated</span>
                    <p className="font-semibold text-gray-900">{formatCurrency(item.estimated_cost)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Actual</span>
                    <p className="font-semibold text-gray-900">
                      {expTotal > 0 ? (
                        <>{formatCurrency(expTotal)} <span className="text-xs text-gray-400">({item.expenses.length})</span></>
                      ) : item.actual_cost ? (
                        formatCurrency(item.actual_cost)
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Variance */}
                {variance !== null && (
                  <p className={`text-sm font-medium mb-2 ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {variance >= 0 ? '↓' : '↑'} {formatCurrency(Math.abs(variance))}{' '}
                    <span className="font-normal text-gray-500">{variance >= 0 ? 'under' : 'over'}</span>
                  </p>
                )}

                {/* Expense toggle */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-800 font-medium transition-colors"
                >
                  {isOpen ? <ChevronDownIcon size={14} /> : <ChevronRight size={14} />}
                  {item.expenses.length > 0
                    ? `${item.expenses.length} expense${item.expenses.length !== 1 ? 's' : ''}`
                    : 'Log expense'}
                </button>

                {isOpen && <MobileExpensePanel item={item} />}
              </div>
            )
          })
        )}
      </div>

      {/* ── Desktop table ─────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
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

      <div className="px-4 py-2 border-t border-gray-100 text-sm text-gray-400">
        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

function SortIcon({ state }: { state: false | 'asc' | 'desc' }) {
  if (state === 'asc') return <ChevronUp size={14} />
  if (state === 'desc') return <ChevronDown size={14} />
  return <ChevronsUpDown size={14} className="opacity-40" />
}
