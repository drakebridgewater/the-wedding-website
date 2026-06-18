import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateTag, useDeleteTag, useTags } from './api'

interface TagFilterBarProps {
  activeTag: number | null
  onSelect: (tagId: number | null) => void
  manage: boolean
}

export function TagFilterBar({ activeTag, onSelect, manage }: TagFilterBarProps) {
  const { data: tags } = useTags()
  const createTag = useCreateTag()
  const deleteTag = useDeleteTag()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      await createTag.mutateAsync(trimmed)
      setName('')
      setAdding(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add tag')
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          activeTag === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>

      {(tags ?? []).map((tag) => (
        <span key={tag.id} className="inline-flex items-center">
          <button
            onClick={() => onSelect(tag.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTag === tag.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tag.name}
          </button>
          {manage && (
            <button
              onClick={() => deleteTag.mutate(tag.id)}
              aria-label={`Delete tag ${tag.name}`}
              className="ml-0.5 text-gray-400 hover:text-red-500"
            >
              <X size={13} />
            </button>
          )}
        </span>
      ))}

      {manage && (
        adding ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setName('') }
              }}
              placeholder="Tag name"
              className="w-24 border border-gray-200 rounded-full px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button onClick={handleAdd} className="text-xs text-indigo-600 font-medium">Add</button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-gray-500 hover:bg-gray-100"
          >
            <Plus size={13} /> Tag
          </button>
        )
      )}
    </div>
  )
}
