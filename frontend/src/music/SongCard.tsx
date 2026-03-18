import { ExternalLink, Trash2 } from 'lucide-react'
import type { Song, Source } from './types'
import { useDeleteSong } from './api'

const SOURCE_LABEL: Record<Source, string> = {
  youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', other: 'Link', '': '',
}
const SOURCE_COLOR: Record<Source, string> = {
  youtube: 'bg-red-100 text-red-700',
  spotify: 'bg-green-100 text-green-700',
  soundcloud: 'bg-orange-100 text-orange-700',
  other: 'bg-stone-100 text-stone-500',
  '': '',
}

interface Props { song: Song }

export function SongCard({ song }: Props) {
  const deleteSong = useDeleteSong()

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 shadow-sm px-4 py-3 group">
      {song.thumbnail_url && (
        <a href={song.url || '#'} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
          <img
            src={song.thumbnail_url}
            alt={song.title}
            className="w-16 h-12 object-cover rounded-md"
          />
        </a>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {song.url ? (
            <a
              href={song.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-stone-800 hover:text-rose-600 transition-colors flex items-center gap-1"
            >
              {song.title}
              <ExternalLink size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>
          ) : (
            <span className="text-sm font-medium text-stone-800">{song.title}</span>
          )}
          {song.artist && (
            <span className="text-xs text-stone-400">{song.artist}</span>
          )}
          {song.source && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${SOURCE_COLOR[song.source]}`}>
              {SOURCE_LABEL[song.source]}
            </span>
          )}
        </div>
        {song.notes && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">{song.notes}</p>
        )}
      </div>

      <button
        onClick={() => deleteSong.mutate(song.id)}
        disabled={deleteSong.isPending}
        className="flex-shrink-0 p-1.5 rounded hover:bg-rose-50 text-stone-300 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
