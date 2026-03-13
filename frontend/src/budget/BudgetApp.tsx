import { useState } from 'react'
import { Plus, AlertCircle, Loader2 } from 'lucide-react'
import { BudgetTable } from './BudgetTable'
import { BudgetSummary } from './BudgetSummary'
import { BudgetForm } from './BudgetForm'
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
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            <Plus size={16} />
            Add Item
          </button>
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

      {/* Modal form */}
      {formOpen && (
        <BudgetForm
          item={editItem}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isPending={createItem.isPending || updateItem.isPending}
        />
      )}
    </div>
  )
}
