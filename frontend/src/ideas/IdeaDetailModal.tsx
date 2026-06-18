import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Heart, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteIdea, useUpdateIdea } from './api'
import { TagEditor } from './TagEditor'
import { SOURCE_LABELS, type Idea } from './types'

interface IdeaDetailModalProps {
  idea: Idea
  onClose: () => void
}

export function IdeaDetailModal({ idea, onClose }: IdeaDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const update = useUpdateIdea()
  const del = useDeleteIdea()

  const [title, setTitle] = useState(idea.title)
  const [description, setDescription] = useState(idea.description)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    try {
      await update.mutateAsync({ id: idea.id, title, description })
      toast.success('Idea saved')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    }
  }

  async function handleDelete() {
    try {
      await del.mutateAsync(idea.id)
      toast.success('Idea deleted')
      onClose()
    } catch {
      toast.error('Could not delete')
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      <div className="relative z-10 w-full md:max-w-3xl bg-white rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col md:flex-row max-h-[90dvh] overflow-hidden">
        {/* Image */}
        <div className="md:w-1/2 bg-gray-100 flex items-center justify-center max-h-[40dvh] md:max-h-none overflow-hidden">
          {idea.image_url ? (
            <img src={idea.image_url} alt={idea.title || 'Idea'} className="w-full h-full object-contain" />
          ) : (
            <div className="p-12 text-gray-400 text-sm">No image</div>
          )}
        </div>

        {/* Details */}
        <div className="md:w-1/2 flex flex-col p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">
              {SOURCE_LABELS[idea.source]}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => update.mutate({ id: idea.id, is_favorite: !idea.is_favorite })}
                aria-label="Toggle favorite"
                className="p-1.5 rounded-full hover:bg-gray-100"
              >
                <Heart size={18} className={idea.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500'} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />

          {/* Tags — type-to-create, saved instantly */}
          <TagEditor ideaId={idea.id} tags={idea.tags} />

          {idea.source_url && (
            <a
              href={idea.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mb-4"
            >
              <ExternalLink size={13} /> View source
            </a>
          )}

          <div className="flex items-center gap-3 mt-auto pt-2">
            <button
              onClick={handleSave}
              disabled={update.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleDelete}
              disabled={del.isPending}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
