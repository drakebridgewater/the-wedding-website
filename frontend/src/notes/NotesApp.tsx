import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Note, useNotes } from './api'
import { NoteCard } from './NoteCard'
import { NoteModal } from './NoteModal'

export function NotesApp() {
  const { data: notes, isLoading } = useNotes()
  const [editingNote, setEditingNote] = useState<Note | null | 'new'>(null)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      <div className="max-w-5xl mx-auto px-3 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 px-1">Notes</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-xl min-h-[140px]" />
            ))}
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => setEditingNote(note)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg">No notes yet.</p>
            <p className="text-sm mt-1">Tap the + button to add one.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setEditingNote('new')}
        className="fixed bottom-6 right-24 z-10 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors active:scale-95"
        aria-label="Add note"
      >
        <Plus size={26} />
      </button>

      {editingNote !== null && (
        <NoteModal
          note={editingNote === 'new' ? undefined : editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  )
}
