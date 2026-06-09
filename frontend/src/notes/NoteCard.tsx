import { formatDistanceToNow } from 'date-fns'
import { Note } from './api'

const COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-200 hover:bg-yellow-300',
  pink:   'bg-pink-200 hover:bg-pink-300',
  blue:   'bg-blue-200 hover:bg-blue-300',
  green:  'bg-green-200 hover:bg-green-300',
  purple: 'bg-purple-200 hover:bg-purple-300',
  orange: 'bg-orange-200 hover:bg-orange-300',
}

function isContentEmpty(html: string): boolean {
  return !html || html === '<p></p>'
}

interface NoteCardProps {
  note: Note
  onClick: () => void
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const colorClass = COLOR_CLASSES[note.color] ?? COLOR_CLASSES.yellow
  const empty = !note.title && isContentEmpty(note.content)
  const updatedAgo = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl shadow-sm p-4 min-h-[140px] flex flex-col gap-2 transition-colors cursor-pointer ${colorClass}`}
    >
      {note.title && (
        <p className="font-semibold text-gray-800 text-sm leading-snug break-words">
          {note.title}
        </p>
      )}
      {!isContentEmpty(note.content) && (
        <div
          className="text-gray-700 text-sm leading-snug break-words line-clamp-6 flex-1 rich-content overflow-hidden"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      )}
      {empty && (
        <p className="text-gray-400 text-sm italic">Empty note</p>
      )}
      <div className="mt-auto pt-2 border-t border-black/10 flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>{note.created_by_name ?? 'Unknown'}</span>
        <span title={new Date(note.updated_at).toLocaleString()}>{updatedAgo}</span>
      </div>
    </button>
  )
}
