import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateTag, useTags, useUpdateIdea } from './api'
import type { IdeaTag } from './types'

interface TagEditorProps {
  ideaId: number
  tags: IdeaTag[]
}

/**
 * Phone-first tag editor for a single idea. Type a word and press enter (or tap
 * "Create") to make a new tag and apply it in one step; tap an existing tag to
 * add it. Every change saves immediately — no separate Save step.
 */
export function TagEditor({ ideaId, tags }: TagEditorProps) {
  const { data: allTags } = useTags()
  const createTag = useCreateTag()
  const update = useUpdateIdea()

  const [applied, setApplied] = useState<IdeaTag[]>(tags)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  // Reset when the editor is reused for a different idea.
  useEffect(() => { setApplied(tags) }, [ideaId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(next: IdeaTag[]) {
    const prev = applied
    setApplied(next) // optimistic
    try {
      await update.mutateAsync({ id: ideaId, tag_ids: next.map((t) => t.id) })
    } catch (e) {
      setApplied(prev)
      toast.error(e instanceof Error ? e.message : 'Could not update tags')
    }
  }

  async function addByName(raw: string) {
    const name = raw.trim()
    if (!name || busy) return
    if (applied.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setQuery('')
      return
    }
    setBusy(true)
    try {
      let tag = (allTags ?? []).find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (!tag) tag = await createTag.mutateAsync(name)
      await persist([...applied, tag])
      setQuery('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add tag')
    } finally {
      setBusy(false)
    }
  }

  const norm = query.trim().toLowerCase()
  const suggestions = (allTags ?? [])
    .filter((t) => !applied.some((a) => a.id === t.id))
    .filter((t) => !norm || t.name.toLowerCase().includes(norm))
    .slice(0, 8)
  const exactExists = (allTags ?? []).some((t) => t.name.toLowerCase() === norm)
  const canCreate = norm.length > 0 && !exactExists

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 mb-1.5">Tags</p>

      {/* Applied tags */}
      {applied.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {applied.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-medium bg-indigo-600 text-white"
            >
              {tag.name}
              <button
                onClick={() => persist(applied.filter((t) => t.id !== tag.id))}
                aria-label={`Remove ${tag.name}`}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add-a-tag input (text-base avoids iOS zoom-on-focus) */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); addByName(query) }
        }}
        placeholder="Add a tag…"
        enterKeyHint="done"
        autoCapitalize="words"
        autoComplete="off"
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />

      {/* Create + existing-tag suggestions (big tap targets) */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {canCreate && (
          <button
            onClick={() => addByName(query)}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            <Plus size={15} /> Create “{query.trim()}”
          </button>
        )}
        {suggestions.map((tag) => (
          <button
            key={tag.id}
            onClick={() => persist([...applied, tag])}
            className="px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            {tag.name}
          </button>
        ))}
        {!canCreate && suggestions.length === 0 && applied.length === 0 && (
          <span className="text-xs text-gray-400">Type a word and press enter to tag this idea.</span>
        )}
      </div>
    </div>
  )
}
