import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateTodo } from './api'
import type { Priority } from './types'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.coerce.number().optional(),
  assignee: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  drakeEmail?: string
  shawnaEmail?: string
}

export function CreateTaskModal({ open, onClose, drakeEmail, shawnaEmail }: Props) {
  const create = useCreateTodo()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const onSubmit = (data: FormData) => {
    create.mutate(
      {
        title: data.title,
        content: data.content || undefined,
        due_date: data.due_date || undefined,
        priority: (data.priority as Priority) ?? undefined,
        assignee: data.assignee || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Task created!')
          onClose()
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div
      className="fixed inset-0 z-[1040] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register('title')} className={inputCls} placeholder="What needs to be done?" autoFocus />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea {...register('content')} rows={2} className={inputCls} placeholder="Optional details..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input {...register('due_date')} type="date" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select {...register('priority')} className={inputCls}>
                <option value={0}>None</option>
                <option value={1}>Low</option>
                <option value={3}>Medium</option>
                <option value={5}>High</option>
              </select>
            </div>
          </div>

          {(drakeEmail || shawnaEmail) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select {...register('assignee')} className={inputCls}>
                <option value="">Unassigned</option>
                {drakeEmail && <option value={drakeEmail}>Drake</option>}
                {shawnaEmail && <option value={shawnaEmail}>Shawna</option>}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {create.isPending ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
