import { useState } from 'react'
import { Heart, Plus, Search, Settings2 } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { useIdeas, usePinterestSync, useUpdateIdea } from './api'
import { AddIdeaModal } from './AddIdeaModal'
import { IdeaCard } from './IdeaCard'
import { IdeaDetailModal } from './IdeaDetailModal'
import { TagFilterBar } from './TagFilterBar'
import { SOURCE_LABELS, type Idea, type IdeaSource } from './types'

export function IdeasApp() {
  const [activeTag, setActiveTag] = useState<number | null>(null)
  const [source, setSource] = useState<IdeaSource | ''>('')
  const [favorite, setFavorite] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Idea | null>(null)
  const [manageTags, setManageTags] = useState(false)

  const { data: ideas, isLoading } = useIdeas({ tag: activeTag, source, favorite, q })
  const update = useUpdateIdea()
  const pinterest = usePinterestSync()

  async function handlePinterestSync() {
    try {
      const res = await pinterest.mutateAsync(undefined)
      toast.success(res.imported ? `Imported ${res.imported} pin(s)` : 'No new pins to import')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Pinterest sync failed')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-1 py-2">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Idea Board</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePinterestSync}
            disabled={pinterest.isPending}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {pinterest.isPending ? 'Importing…' : 'Import from Pinterest'}
          </button>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus size={16} /> Add idea
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ideas…"
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-full text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value as IdeaSource | '')}
            className="py-1.5 px-3 border border-gray-200 rounded-full text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All sources</option>
            {(Object.keys(SOURCE_LABELS) as IdeaSource[]).map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>

          <button
            onClick={() => setFavorite((f) => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              favorite ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart size={14} className={favorite ? 'fill-white' : ''} /> Favorites
          </button>

          <button
            onClick={() => setManageTags((m) => !m)}
            aria-label="Manage tags"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              manageTags ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Settings2 size={14} /> Tags
          </button>
        </div>

        <TagFilterBar activeTag={activeTag} onSelect={setActiveTag} manage={manageTags} />
      </div>

      {/* Masonry grid */}
      {isLoading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 bg-gray-200 animate-pulse rounded-xl"
              style={{ height: `${140 + (i % 4) * 50}px` }}
            />
          ))}
        </div>
      ) : ideas && ideas.length > 0 ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onClick={() => setSelected(idea)}
              onToggleFavorite={() => update.mutate({ id: idea.id, is_favorite: !idea.is_favorite })}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 py-16">
          No ideas yet. Add one, paste a Pinterest pin, or import a board.
        </p>
      )}

      {adding && <AddIdeaModal onClose={() => setAdding(false)} />}
      {selected && <IdeaDetailModal idea={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
