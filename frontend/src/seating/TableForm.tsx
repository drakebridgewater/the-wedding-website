import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TableFormData } from './types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  shape: z.enum(['round', 'square']),
  grid_x: z.coerce.number().int().min(0),
  grid_y: z.coerce.number().int().min(0),
  grid_width: z.coerce.number().int().min(1).max(10),
  grid_height: z.coerce.number().int().min(1).max(10),
  notes: z.string().optional().default(''),
})

interface Props {
  initialValues?: Partial<TableFormData>
  onSubmit: (data: TableFormData) => void
  onCancel: () => void
  submitLabel?: string
}

export function TableForm({ initialValues, onSubmit, onCancel, submitLabel = 'Add Table' }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<TableFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      capacity: 8,
      shape: 'round',
      grid_x: 0,
      grid_y: 0,
      grid_width: 2,
      grid_height: 2,
      notes: '',
      ...initialValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
        <input
          {...register('name')}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none"
          placeholder="Table 1"
        />
        {errors.name && <p className="mt-0.5 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
          <input
            {...register('capacity')}
            type="number" min={1}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none"
          />
          {errors.capacity && <p className="mt-0.5 text-xs text-red-500">{errors.capacity.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Shape</label>
          <select
            {...register('shape')}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none"
          >
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Width (cells)</label>
          <input
            {...register('grid_width')}
            type="number" min={1} max={10}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Height (cells)</label>
          <input
            {...register('grid_height')}
            type="number" min={1} max={10}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
        <input
          {...register('notes')}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none"
          placeholder="Optional notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
