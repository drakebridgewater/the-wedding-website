import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BudgetItem, ItemFormData } from './api'

const CATEGORIES = [
  ['venue', 'Venue'],
  ['catering', 'Catering'],
  ['cake', 'Cake & Desserts'],
  ['flowers', 'Flowers & Décor'],
  ['entertainment', 'Entertainment'],
  ['attire', 'Attire'],
  ['beauty', 'Beauty & Hair'],
  ['photography', 'Photography & Video'],
  ['stationery', 'Stationery'],
  ['transportation', 'Transportation'],
  ['gifts', 'Gifts & Favors'],
  ['miscellaneous', 'Miscellaneous'],
] as const

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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {item ? 'Edit Budget Item' : 'Add Budget Item'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" error={errors.category?.message}>
              <select {...register('category')} className={inputCls(errors.category?.message)}>
                <option value="">Select…</option>
                {CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Estimated Cost ($)" error={errors.estimated_cost?.message}>
              <input
                {...register('estimated_cost')}
                className={inputCls(errors.estimated_cost?.message)}
                placeholder="5000"
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
