import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories, useCreateCategory } from './api'
import type { BudgetItem, ItemFormData } from './api'

const schema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  estimated_cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid dollar amount'),
  vendor_name: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  is_paid: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  item?: BudgetItem | null
  onSubmit: (data: ItemFormData) => void
  onCancel: () => void
  isPending: boolean
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function inputCls(error?: string) {
  return cn(
    'w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2',
    error ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-rose-400',
  )
}

export function BudgetForm({ item, onSubmit, onCancel, isPending }: Props) {
  const { data: categories = [], isLoading: catsLoading } = useCategories()
  const createCategory = useCreateCategory()
  const [addingCat, setAddingCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: item?.category ?? '',
      description: item?.description ?? '',
      estimated_cost: item?.estimated_cost ?? '',
      vendor_name: item?.vendor_name ?? '',
      notes: item?.notes ?? '',
      is_paid: item?.is_paid ?? false,
    },
  })

  useEffect(() => {
    reset({
      category: item?.category ?? '',
      description: item?.description ?? '',
      estimated_cost: item?.estimated_cost ?? '',
      vendor_name: item?.vendor_name ?? '',
      notes: item?.notes ?? '',
      is_paid: item?.is_paid ?? false,
    })
  }, [item, reset])

  function submit(values: FormValues) {
    onSubmit({
      category: values.category,
      description: values.description,
      estimated_cost: values.estimated_cost,
      vendor_name: values.vendor_name || null,
      notes: values.notes || null,
      is_paid: values.is_paid,
    })
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    const label = newCatLabel.trim()
    if (!label) return
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    createCategory.mutate({ slug, label }, {
      onSuccess: (cat) => {
        setValue('category', cat.slug)
        setNewCatLabel('')
        setAddingCat(false)
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {item ? 'Edit Budget Item' : 'Add Budget Item'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-6 py-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category" error={errors.category?.message}>
              <div className="space-y-1.5">
                <select
                  {...register('category')}
                  className={inputCls(errors.category?.message)}
                  disabled={catsLoading}
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>

                {addingCat ? (
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Category name"
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && (setAddingCat(false), setNewCatLabel(''))}
                      className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={createCategory.isPending || !newCatLabel.trim()}
                      className="px-2.5 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
                    >
                      {createCategory.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingCat(false); setNewCatLabel('') }}
                      className="px-2.5 py-1.5 rounded-md border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingCat(true)}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
                  >
                    <Plus size={12} />
                    New category
                  </button>
                )}
              </div>
            </Field>

            <Field label="Estimated Cost ($)" error={errors.estimated_cost?.message}>
              <input
                {...register('estimated_cost')}
                className={inputCls(errors.estimated_cost?.message)}
                placeholder="5000"
                inputMode="decimal"
              />
            </Field>
          </div>

          <Field label="Description" error={errors.description?.message}>
            <input
              {...register('description')}
              className={inputCls(errors.description?.message)}
              placeholder="e.g. Catering deposit"
            />
          </Field>

          <Field label="Vendor Name" error={errors.vendor_name?.message}>
            <input {...register('vendor_name')} className={inputCls()} placeholder="Optional" />
          </Field>

          <Field label="Notes" error={errors.notes?.message}>
            <textarea {...register('notes')} rows={2} className={inputCls()} placeholder="Optional notes" />
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" {...register('is_paid')} className="rounded" />
            Mark as fully paid
          </label>

          <p className="text-xs text-gray-400">
            Log individual expense payments using the ▶ button on each row.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
