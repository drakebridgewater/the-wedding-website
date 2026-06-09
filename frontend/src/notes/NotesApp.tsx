import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Note, useNotes } from './api'
import { NoteCard } from './NoteCard'
import { NoteModal } from './NoteModal'

type SortKey = 'updated' | 'created' | 'title' | 'creator'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated',  label: 'Last updated' },
  { value: 'created',  label: 'Date created' },
  { value: 'title',    label: 'Title' },
  { value: 'creator',  label: 'Creator' },
]

function sortNotes(notes: Note[], key: SortKey): Note[] {
  return [...notes].sort((a, b) => {
    switch (key) {
      case 'updated':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'title':
        return (a.title || '').localeCompare(b.title || '')
      case 'creator':
        return (a.created_by_name ?? '').localeCompare(b.created_by_name ?? '')
    }
  })
}

export function NotesApp() {
  const { data: notes, isLoading } = useNotes()
  const [editingNote, setEditingNote] = useState<Note | null | 'new'>(null)
  const [sortKey, setSortKey] = useState<SortKey>('updated')

  const sorted = useMemo(() => sortNotes(notes ?? [], sortKey), [notes, sortKey])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <button
          onClick={() => setEditingNote('new')}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-gray-500 shrink-0">Sort by:</span>
        <div className="flex gap-1 flex-wrap">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSortKey(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sortKey === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-xl min-h-[140px]" />
          ))}
        </div>
      ) : sorted.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => setEditingNote(note)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 py-12">No notes yet.</p>
      )}

      {editingNote !== null && (
        <NoteModal
          note={editingNote === 'new' ? undefined : editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  )
}
