import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Note, useNotes } from './api'
import { NoteCard } from './NoteCard'
import { NoteModal } from './NoteModal'

export function NotesApp() {
  const { data: notes, isLoading } = useNotes()
  const [editingNote, setEditingNote] = useState<Note | null | 'new'>(null)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <button
          onClick={() => setEditingNote('new')}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-xl min-h-[140px]" />
          ))}
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {notes.map((note) => (
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
