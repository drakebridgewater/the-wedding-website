import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Note, NoteColor, useCreateNote, useDeleteNote, useUpdateNote } from './api'

const COLORS: { value: NoteColor; bg: string; ring: string }[] = [
  { value: 'yellow', bg: 'bg-yellow-300', ring: 'ring-yellow-500' },
  { value: 'pink',   bg: 'bg-pink-300',   ring: 'ring-pink-500' },
  { value: 'blue',   bg: 'bg-blue-300',   ring: 'ring-blue-500' },
  { value: 'green',  bg: 'bg-green-300',  ring: 'ring-green-500' },
  { value: 'purple', bg: 'bg-purple-300', ring: 'ring-purple-500' },
  { value: 'orange', bg: 'bg-orange-300', ring: 'ring-orange-500' },
]

interface FormValues {
  title: string
  content: string
  color: NoteColor
}

interface NoteModalProps {
  note?: Note
  onClose: () => void
}

export function NoteModal({ note, onClose }: NoteModalProps) {
  const isEdit = !!note
  const create = useCreateNote()
  const update = useUpdateNote()
  const del = useDeleteNote()
  const overlayRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      title: note?.title ?? '',
      content: note?.content ?? '',
      color: (note?.color as NoteColor) ?? 'yellow',
    },
  })

  const selectedColor = watch('color')

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Trap scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function onSubmit(values: FormValues) {
    if (!values.title.trim() && !values.content.trim()) return
    try {
      if (isEdit) {
        await update.mutateAsync({ id: note.id, ...values })
        toast.success('Note saved')
      } else {
        await create.mutateAsync(values)
        toast.success('Note added')
      }
      onClose()
    } catch {
      toast.error('Something went wrong')
    }
  }

  async function handleDelete() {
    if (!note) return
    try {
      await del.mutateAsync(note.id)
      toast.success('Note deleted')
      onClose()
    } catch {
      toast.error('Could not delete note')
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Sheet / Modal */}
      <div className="relative z-10 w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-semibold text-gray-800 text-base">
            {isEdit ? 'Edit note' : 'New note'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 px-4 pb-6 overflow-y-auto">
          {/* Color picker */}
          <div className="flex gap-2 py-1">
            {COLORS.map(({ value, bg, ring }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('color', value)}
                className={`w-8 h-8 rounded-full ${bg} transition-all ${
                  selectedColor === value ? `ring-2 ring-offset-2 ${ring}` : ''
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <input
            {...register('title')}
            placeholder="Title (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          {/* Content */}
          <textarea
            {...register('content')}
            placeholder="Write your note…"
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={del.isPending}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} />
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
