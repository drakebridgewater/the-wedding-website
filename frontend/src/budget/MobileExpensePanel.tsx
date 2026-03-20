import { useState } from 'react'
import { Trash2, Plus, Loader2, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCreateExpense, useDeleteExpense } from './api'
import type { BudgetItem } from './api'

interface Props {
  item: BudgetItem
}

export function MobileExpensePanel({ item }: Props) {
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
      { itemId: item.id, data: { amount: formAmount, description: formDesc, paid_on: formDate || undefined } },
      {
        onSuccess: () => {
          setFormAmount(''); setFormDesc(''); setFormDate(''); setShowForm(false)
        },
      },
    )
  }

  return (
    <div className="mt-3 pl-2 border-l-2 border-rose-200 space-y-2">
      {item.expenses.map((exp) => (
        <div key={exp.id} className="flex items-start justify-between gap-2 text-sm">
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 font-medium leading-snug">{exp.description}</p>
            {exp.paid_on && (
              <p className="text-xs text-gray-400">
                {new Date(exp.paid_on + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-gray-900">{formatCurrency(exp.amount)}</span>
            <button
              onClick={() => deleteExpense.mutate(exp.id)}
              disabled={deleteExpense.isPending}
              className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}

      {item.expenses.length > 1 && (
        <p className="text-sm font-semibold text-rose-700 border-t border-rose-100 pt-1">
          Total: {formatCurrency(item.expense_total)}
        </p>
      )}

      {showForm ? (
        <form onSubmit={handleAdd} className="pt-1 space-y-2">
          <input
            autoFocus
            type="text"
            placeholder="Description"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount ($)"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              step="0.01"
              min="0"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createExpense.isPending || !formAmount || !formDesc}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {createExpense.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-800 font-medium transition-colors"
        >
          <Plus size={14} />
          Log expense
        </button>
      )}
    </div>
  )
}
