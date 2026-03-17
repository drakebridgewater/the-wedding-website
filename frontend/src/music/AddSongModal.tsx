import { useState } from 'react'
import type { CreateSongData, FetchedMetadata, ListType, Moment, Source } from './types'
import { MOMENT_LABELS, MOMENT_ORDER } from './types'
import { useCreateSong, useFetchUrl } from './api'

interface Props {
  listType: ListType
  onClose: () => void
}

const INITIAL_FORM: Omit<CreateSongData, 'list_type'> = {
  moment: 'other',
  title: '',
  artist: '',
  url: '',
  source: '' as Source,
  thumbnail_url: '',
  notes: '',
}

export function AddSongModal({ listType, onClose }: Props) {
  const [urlInput, setUrlInput] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  const fetchUrl = useFetchUrl()
  const createSong = useCreateSong()

  function handleFetch() {
    fetchUrl.mutate(urlInput, {
      onSuccess: (meta: FetchedMetadata) => {
        setForm((prev) => ({
          ...prev,
          title: meta.title || prev.title,
          artist: meta.artist || prev.artist,
          thumbnail_url: meta.thumbnail_url || prev.thumbnail_url,
          source: meta.source || prev.source,
          url: urlInput,
        }))
      },
      onError: () => {
        setForm((prev) => ({ ...prev, url: urlInput }))
      },
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createSong.mutate(
      { ...form, list_type: listType, url: urlInput || form.url },
      { onSuccess: onClose },
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Add Song</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280' }}>×</button>
        </div>

        {/* Step 1: URL fetch */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Share URL (YouTube, Spotify, SoundCloud)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleFetch}
              disabled={!urlInput || fetchUrl.isPending}
              style={{
                padding: '8px 14px', borderRadius: 6, border: 'none',
                background: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 600,
                opacity: !urlInput ? 0.5 : 1,
              }}
            >
              {fetchUrl.isPending ? '…' : 'Fetch'}
            </button>
          </div>
          {fetchUrl.isError && (
            <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>
              Could not fetch metadata — fill in manually below.
            </p>
          )}
        </div>

        {/* Step 2: form (always visible, pre-filled after fetch) */}
        <form onSubmit={handleSubmit}>
          {form.thumbnail_url && (
            <div style={{ marginBottom: 12 }}>
              <img src={form.thumbnail_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6 }} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Artist</label>
            <input
              value={form.artist}
              onChange={(e) => setForm((p) => ({ ...p, artist: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {listType === 'playlist' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Moment</label>
              <select
                value={form.moment}
                onChange={(e) => setForm((p) => ({ ...p, moment: e.target.value as Moment }))}
                style={inputStyle}
              >
                {MOMENT_ORDER.map((m) => (
                  <option key={m} value={m}>{MOMENT_LABELS[m]}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db',
              background: '#fff', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSong.isPending}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}
            >
              {createSong.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>

          {createSong.isError && (
            <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
              Failed to save — please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
