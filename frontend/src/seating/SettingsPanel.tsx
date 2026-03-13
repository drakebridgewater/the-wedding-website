import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { SeatingConfig } from './types'
import { useUpdateConfig } from './api'

const schema = z.object({
  grid_cols: z.coerce.number().int().min(5).max(60),
  grid_rows: z.coerce.number().int().min(5).max(40),
})

interface Props {
  config: SeatingConfig
  onClose: () => void
}

export function SettingsPanel({ config, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const updateConfig = useUpdateConfig()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { grid_cols: config.grid_cols, grid_rows: config.grid_rows },
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function onSubmit(data: { grid_cols: number; grid_rows: number }) {
    updateConfig.mutate(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={ref} className="w-80 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Venue Grid Settings</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Columns (width)
            </label>
            <input
              {...register('grid_cols')}
              type="number" min={5} max={60}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
            />
            {errors.grid_cols && (
              <p className="mt-1 text-xs text-red-500">{errors.grid_cols.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rows (height)
            </label>
            <input
              {...register('grid_rows')}
              type="number" min={5} max={40}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
            />
            {errors.grid_rows && (
              <p className="mt-1 text-xs text-red-500">{errors.grid_rows.message}</p>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Each cell is 56×56px. Current size:{' '}
            {config.grid_cols} × {config.grid_rows} cells.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
