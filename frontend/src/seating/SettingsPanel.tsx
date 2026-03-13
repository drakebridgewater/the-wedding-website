import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { SeatingConfig } from './types'
import { useUpdateConfig } from './api'

const schema = z.object({
  grid_cols: z.coerce.number().int().min(5).max(60),
  grid_rows: z.coerce.number().int().min(5).max(40),
  cell_size_ft: z.coerce.number().positive().max(20),
})

interface Props {
  config: SeatingConfig
  onClose: () => void
}

export function SettingsPanel({ config, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const updateConfig = useUpdateConfig()

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      grid_cols: config.grid_cols,
      grid_rows: config.grid_rows,
      cell_size_ft: config.cell_size_ft,
    },
  })

  const [cols, rows, cellFt] = useWatch({ control, name: ['grid_cols', 'grid_rows', 'cell_size_ft'] })
  const roomW = Math.round((cols || 0) * (cellFt || 0) * 10) / 10
  const roomH = Math.round((rows || 0) * (cellFt || 0) * 10) / 10

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function onSubmit(data: { grid_cols: number; grid_rows: number; cell_size_ft: number }) {
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Columns
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
                Rows
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cell size (ft)
            </label>
            <input
              {...register('cell_size_ft')}
              type="number" min={0.5} max={20} step={0.5}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
            />
            {errors.cell_size_ft && (
              <p className="mt-1 text-xs text-red-500">{errors.cell_size_ft.message}</p>
            )}
          </div>

          {/* Live room size preview */}
          <div className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm">
            <p className="text-xs font-medium text-rose-700 mb-0.5">Room size</p>
            <p className="text-rose-900 font-semibold">{roomW} ft × {roomH} ft</p>
            <p className="text-xs text-rose-500 mt-0.5">{cols}×{rows} cells · {cellFt} ft/cell</p>
          </div>

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
