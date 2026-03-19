import { useEffect, useState } from 'react'
import { Search, Link, Loader2 } from 'lucide-react'
import type { CreateSongData, ListType, Moment, Source } from './types'
import { MOMENT_LABELS, MOMENT_ORDER } from './types'
import { useCreateSong, useFetchUrl, useMusicBrainzSearch } from './api'

interface Props {
  listType: ListType
  prefill: Partial<CreateSongData> | null
  onClose: () => void
}

type SearchMode = 'search' | 'url'

const BLANK: Omit<CreateSongData, 'list_type'> = {
  moment: 'review', title: '', artist: '', url: '', source: '' as Source, thumbnail_url: '', notes: '',
}

function fmtDuration(ms: number | null): string {
  if (!ms) return ''
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function AddSongModal({ listType, prefill, onClose }: Props) {
  const [mode, setMode] = useState<SearchMode>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [form, setForm] = useState<Omit<CreateSongData, 'list_type'>>({
    ...BLANK,
    moment: listType === 'do_not_play' ? 'review' : (prefill?.moment ?? 'review'),
    ...(prefill ? { title: prefill.title ?? '', artist: prefill.artist ?? '' } : {}),
  })

  const fetchUrl = useFetchUrl()
  const createSong = useCreateSong()

  // Debounce MusicBrainz search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { data: searchResults = [], isFetching: isSearching } = useMusicBrainzSearch(debouncedQ)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSelectResult(title: string, artist: string) {
    set('title', title)
    set('artist', artist)
    setSearchQuery('')
    setDebouncedQ('')
  }

  function handleFetch() {
    fetchUrl.mutate(urlInput, {
      onSuccess: (meta) => {
        set('title', meta.title || form.title)
        set('artist', meta.artist || form.artist)
        set('thumbnail_url', meta.thumbnail_url || form.thumbnail_url)
        set('source', meta.source || form.source)
        set('url', urlInput)
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

  const inputCls = 'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400'
  const labelCls = 'block text-xs font-medium text-stone-600 mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">Add Song</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-stone-100 p-1 gap-1">
            {([['search', <Search size={12} />, 'Search by name'],
               ['url',    <Link    size={12} />, 'Add by URL']] as const).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === id ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Search mode */}
          {mode === 'search' && (
            <div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search song title or artist…"
                  className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
                {isSearching && (
                  <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 animate-spin" />
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1.5 border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100 max-h-52 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.mbid}
                      type="button"
                      onClick={() => handleSelectResult(r.title, r.artist)}
                      className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{r.title}</p>
                        <p className="text-xs text-stone-400 truncate">{r.artist}</p>
                      </div>
                      {r.duration_ms && (
                        <span className="flex-shrink-0 text-xs text-stone-300 font-mono">
                          {fmtDuration(r.duration_ms)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {debouncedQ.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="text-xs text-stone-400 mt-1.5 pl-1">No results — try a different search or fill in manually below.</p>
              )}
            </div>
          )}

          {/* URL mode */}
          {mode === 'url' && (
            <div>
              <label className={labelCls}>YouTube, Spotify, or SoundCloud URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://…"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleFetch}
                  disabled={!urlInput || fetchUrl.isPending}
                  className="px-3 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
                >
                  {fetchUrl.isPending ? '…' : 'Fetch'}
                </button>
              </div>
              {fetchUrl.isError && (
                <p className="text-xs text-rose-500 mt-1">Could not fetch metadata — fill in manually below.</p>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-stone-100" />

          {/* Form */}
          <form id="song-form" onSubmit={handleSubmit} className="space-y-3">
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="" className="w-full max-h-40 object-cover rounded-lg" />
            )}
            <div>
              <label className={labelCls}>Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Artist</label>
              <input
                value={form.artist}
                onChange={(e) => set('artist', e.target.value)}
                className={inputCls}
              />
            </div>
            {listType === 'playlist' && (
              <div>
                <label className={labelCls}>Moment</label>
                <select
                  value={form.moment}
                  onChange={(e) => set('moment', e.target.value as Moment)}
                  className={inputCls}
                >
                  {MOMENT_ORDER.map((m) => (
                    <option key={m} value={m}>{MOMENT_LABELS[m]}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="song-form"
            disabled={!form.title || createSong.isPending}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {createSong.isPending ? 'Saving…' : 'Add Song'}
          </button>
        </div>
      </div>
    </div>
  )
}
