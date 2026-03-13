import { useState } from 'react'
import { Plus, AlertCircle, Loader2, Calculator, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { BudgetTable } from './BudgetTable'
import { BudgetSummary } from './BudgetSummary'
import { BudgetForm } from './BudgetForm'
import { EstimatorApp } from '../estimator/EstimatorApp'
import {
  useItems,
  useSummary,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  type BudgetItem,
  type ItemFormData,
} from './api'

export function BudgetApp() {
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [estimatorOpen, setEstimatorOpen] = useState(false)
  const qc = useQueryClient()

  const { data: items, isLoading: itemsLoading, error: itemsError } = useItems()
  const { data: summary } = useSummary()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()

  function openCreate() {
    setEditItem(null)
    setFormOpen(true)
  }

  function openEdit(item: BudgetItem) {
    setEditItem(item)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditItem(null)
  }

  function handleSubmit(data: ItemFormData) {
    if (editItem) {
      updateItem.mutate({ id: editItem.id, data }, { onSuccess: closeForm })
    } else {
      createItem.mutate(data, { onSuccess: closeForm })
    }
  }

  function handleDelete(id: number) {
    if (confirm('Delete this budget item?')) {
      deleteItem.mutate(id)
    }
  }

  function handleImportSuccess() {
    qc.invalidateQueries({ queryKey: ['budget-items'] })
    qc.invalidateQueries({ queryKey: ['budget-summary'] })
  }

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading…
      </div>
    )
  }

  if (itemsError) {
    return (
      <div className="flex items-center gap-2 text-red-600 py-10 justify-center">
        <AlertCircle size={20} />
        Failed to load budget data.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
            <p className="text-sm text-gray-500 mt-1">Track estimates and log expenses — click ▶ on any row</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEstimatorOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Calculator size={16} />
              Estimate
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>
        </div>

        {/* Summary cards + chart */}
        {summary && <BudgetSummary summary={summary} />}

        {/* Table */}
        <BudgetTable
          items={items ?? []}
          onEdit={openEdit}
          onDelete={handleDelete}
          isDeleting={deleteItem.isPending}
        />
      </div>

      {/* Budget item form modal */}
      {formOpen && (
        <BudgetForm
          item={editItem}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isPending={createItem.isPending || updateItem.isPending}
        />
      )}

      {/* Estimator modal */}
      {estimatorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
          onClick={(e) => e.target === e.currentTarget && setEstimatorOpen(false)}
        >
          <div className="relative w-full max-w-4xl rounded-2xl bg-gray-50 shadow-2xl">
            <button
              onClick={() => setEstimatorOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <X size={18} />
            </button>
            <EstimatorApp modal onImportSuccess={handleImportSuccess} />
          </div>
        </div>
      )}
    </div>
  )
}
