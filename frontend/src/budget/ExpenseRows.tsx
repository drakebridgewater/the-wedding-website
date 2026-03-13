import { useState } from 'react'
import { Trash2, Plus, Loader2, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCreateExpense, useDeleteExpense } from './api'
import type { BudgetItem } from './api'

const TOTAL_COLS = 9  // must match column count in BudgetTable

interface Props {
  item: BudgetItem
}

export function ExpenseRows({ item }: Props) {
  const [showForm, setShowForm] = useState(false)
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()

  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!formAmount || !formDesc) return
    createExpense.mutate(
      {
        itemId: item.id,
        data: {
          amount: formAmount,
          description: formDesc,
          paid_on: formDate || undefined,
        },
      },
      {
        onSuccess: () => {
          setFormAmount('')
          setFormDesc('')
          setFormDate('')
          setShowForm(false)
        },
      },
    )
  }

  return (
    <>
      {/* Existing expense rows */}
      {item.expenses.map((exp) => (
        <tr key={exp.id} className="bg-rose-50/40 border-l-2 border-rose-200">
          <td />  {/* expand chevron column */}
          <td />  {/* category column */}
          <td className="px-4 py-2 pl-8 text-sm text-gray-700">{exp.description}</td>
          <td className="px-4 py-2 text-sm text-gray-500">
            {exp.paid_on
              ? new Date(exp.paid_on + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
              : '—'}
          </td>
          <td className="px-4 py-2 text-sm font-medium text-gray-800">
            {formatCurrency(exp.amount)}
          </td>
          <td colSpan={3} />
          <td className="px-4 py-2 text-right">
            <button
              onClick={() => deleteExpense.mutate(exp.id)}
              disabled={deleteExpense.isPending}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
          </td>
        </tr>
      ))}

      {/* Running total row when there are expenses */}
      {item.expenses.length > 1 && (
        <tr className="bg-rose-50/40 border-l-2 border-rose-200">
          <td colSpan={4} />
          <td className="px-4 py-1 text-sm font-semibold text-rose-700 border-t border-rose-200">
            Total: {formatCurrency(item.expense_total)}
          </td>
          <td colSpan={4} />
        </tr>
      )}

      {/* Add expense form row or button */}
      {showForm ? (
        <tr className="bg-rose-50/40 border-l-2 border-rose-200">
          <td colSpan={TOTAL_COLS} className="px-4 py-2 pl-8">
            <form onSubmit={handleAdd} className="flex items-center gap-3 flex-wrap">
              <input
                autoFocus
                type="text"
                placeholder="Description"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="flex-1 min-w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <input
                type="number"
                placeholder="Amount ($)"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                step="0.01"
                min="0"
                className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <button
                type="submit"
                disabled={createExpense.isPending || !formAmount || !formDesc}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {createExpense.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </form>
          </td>
        </tr>
      ) : (
        <tr className="bg-rose-50/20 border-l-2 border-rose-100">
          <td colSpan={TOTAL_COLS} className="px-4 py-1.5 pl-9">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-800 font-medium transition-colors"
            >
              <Plus size={14} />
              Log expense
            </button>
          </td>
        </tr>
      )}
    </>
  )
}
