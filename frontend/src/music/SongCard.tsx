import type { Song, Source } from './types'
import { useDeleteSong } from './api'

const SOURCE_LABELS: Record<Source, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  other: 'Link',
  '': '',
}

const SOURCE_COLORS: Record<Source, string> = {
  youtube: '#ff0000',
  spotify: '#1db954',
  soundcloud: '#ff5500',
  other: '#6b7280',
  '': '',
}

interface Props {
  song: Song
}

export function SongCard({ song }: Props) {
  const deleteSong = useDeleteSong()

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '12px',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      alignItems: 'flex-start',
    }}>
      {song.thumbnail_url && (
        <a href={song.url || '#'} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
          <img
            src={song.thumbnail_url}
            alt={song.title}
            style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }}
          />
        </a>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          {song.url ? (
            <a
              href={song.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 600, fontSize: 15, color: '#1f2937', textDecoration: 'none' }}
            >
              {song.title}
            </a>
          ) : (
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>{song.title}</span>
          )}
          {song.artist && (
            <span style={{ fontSize: 13, color: '#6b7280' }}>{song.artist}</span>
          )}
          {song.source && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 999,
              color: '#fff',
              background: SOURCE_COLORS[song.source],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {SOURCE_LABELS[song.source]}
            </span>
          )}
        </div>
        {song.notes && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{song.notes}</p>
        )}
      </div>

      <button
        onClick={() => deleteSong.mutate(song.id)}
        disabled={deleteSong.isPending}
        title="Remove"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#9ca3af',
          fontSize: 18,
          lineHeight: 1,
          padding: '2px 4px',
        }}
      >
        ×
      </button>
    </div>
  )
}
