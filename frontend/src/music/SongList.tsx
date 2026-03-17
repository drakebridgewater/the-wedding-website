import type { ListType, Moment, Song } from './types'
import { MOMENT_LABELS, MOMENT_ORDER } from './types'
import { useSongs } from './api'
import { SongCard } from './SongCard'

interface Props {
  listType: ListType
  onAdd: () => void
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '8px 16px',
        cursor: 'pointer',
        fontWeight: 600,
        marginBottom: 16,
      }}
    >
      + Add Song
    </button>
  )
}

function EmptyState() {
  return (
    <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
      No songs yet. Paste a YouTube, Spotify, or SoundCloud link to get started.
    </p>
  )
}

export function SongList({ listType, onAdd }: Props) {
  const { data: songs = [], isLoading, isError } = useSongs(listType)

  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading…</p>
  if (isError) return <p style={{ color: '#ef4444' }}>Failed to load songs.</p>

  // Do-Not-Play: flat list, no moment grouping needed
  if (listType === 'do_not_play') {
    return (
      <div>
        <AddButton onClick={onAdd} />
        {songs.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {songs.map((song) => <SongCard key={song.id} song={song} />)}
          </div>
        )}
      </div>
    )
  }

  // Playlist: group by moment
  const grouped = MOMENT_ORDER.reduce<Record<Moment, Song[]>>((acc, moment) => {
    acc[moment] = songs.filter((s) => s.moment === moment)
    return acc
  }, {} as Record<Moment, Song[]>)

  return (
    <div>
      <AddButton onClick={onAdd} />
      {songs.length === 0 && <EmptyState />}
      {MOMENT_ORDER.map((moment) => {
        const group = grouped[moment]
        if (group.length === 0) return null
        return (
          <div key={moment} style={{ marginBottom: 24 }}>
            <h4 style={{
              margin: '0 0 10px',
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#9ca3af',
            }}>
              {MOMENT_LABELS[moment]}
              <span style={{ marginLeft: 8, fontWeight: 400 }}>({group.length})</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.map((song) => <SongCard key={song.id} song={song} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
