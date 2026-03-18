import { useState } from 'react'
import { Plus, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { CreateSongData, ListType, Moment, Song } from './types'
import { MOMENT_LABELS, MOMENT_ORDER } from './types'
import { useSongs } from './api'
import { SongCard } from './SongCard'
import { SUGGESTIONS } from './suggestions'

interface Props {
  listType: ListType
  onAdd: (prefill?: Partial<CreateSongData>) => void
}

function SuggestionPanel({ moment, onAdd }: { moment: Moment; onAdd: (prefill: Partial<CreateSongData>) => void }) {
  const suggestions = SUGGESTIONS[moment] ?? []
  return (
    <div className="mb-4 rounded-xl bg-stone-50 border border-stone-100 p-3">
      <p className="text-xs text-stone-400 mb-2.5">
        Popular picks for this moment — click to add to your list
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {suggestions.map((s) => (
          <div key={s.title} className="flex items-center justify-between bg-white rounded-lg border border-stone-100 px-3 py-2">
            <div className="min-w-0 mr-2">
              <p className="text-sm font-medium text-stone-700 truncate">{s.title}</p>
              <p className="text-xs text-stone-400 truncate">{s.artist}</p>
            </div>
            <button
              onClick={() => onAdd({ title: s.title, artist: s.artist, moment })}
              className="flex-shrink-0 flex items-center gap-0.5 px-2 py-1 rounded-full bg-stone-100 text-stone-500 text-xs font-medium hover:bg-rose-100 hover:text-rose-600 transition-colors"
            >
              <Plus size={10} /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SongList({ listType, onAdd }: Props) {
  const { data: songs = [], isLoading, isError } = useSongs(listType)
  const [openSuggestions, setOpenSuggestions] = useState<Moment | null>(null)

  if (isLoading) return <p className="text-sm text-stone-400">Loading…</p>
  if (isError) return <p className="text-sm text-rose-500">Failed to load songs.</p>

  // Do-Not-Play: flat list, no grouping
  if (listType === 'do_not_play') {
    return (
      <div>
        {songs.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-sm">No songs on the do-not-play list yet.</p>
            <button onClick={() => onAdd()} className="mt-3 text-sm text-rose-600 hover:underline">Add one →</button>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song) => <SongCard key={song.id} song={song} />)}
          </div>
        )}
      </div>
    )
  }

  // Playlist: group by moment
  const grouped = MOMENT_ORDER.reduce<Record<Moment, Song[]>>((acc, m) => {
    acc[m] = songs.filter((s) => s.moment === m)
    return acc
  }, {} as Record<Moment, Song[]>)

  const hasAnySongs = songs.length > 0

  return (
    <div className="space-y-8">
      {!hasAnySongs && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-sm">No songs yet. Use the suggestions below or add your own.</p>
        </div>
      )}

      {MOMENT_ORDER.map((moment) => {
        const group = grouped[moment]
        const isOpen = openSuggestions === moment

        return (
          <div key={moment}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                {MOMENT_LABELS[moment]}
                {group.length > 0 && (
                  <span className="ml-2 font-normal text-stone-300">({group.length})</span>
                )}
              </h4>
              <button
                onClick={() => setOpenSuggestions(isOpen ? null : moment)}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-500 transition-colors"
              >
                <Sparkles size={11} />
                {isOpen ? 'Hide' : 'Suggestions'}
                {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>

            {/* Suggestion panel */}
            {isOpen && <SuggestionPanel moment={moment} onAdd={onAdd} />}

            {/* Songs */}
            {group.length > 0 ? (
              <div className="space-y-2">
                {group.map((song) => <SongCard key={song.id} song={song} />)}
              </div>
            ) : (
              !isOpen && (
                <p className="text-xs text-stone-300 italic py-1">No songs yet for this moment.</p>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
