import { useState } from 'react'
import { Link, Loader2 } from 'lucide-react'
import type { ListType, Moment, Source, Song } from './types'
import { MOMENT_LABELS, MOMENT_ORDER } from './types'
import { useUpdateSong, useFetchUrl } from './api'

interface Props {
  song: Song
  onClose: () => void
}

export function EditSongModal({ song, onClose }: Props) {
  const [form, setForm] = useState({
    title: song.title,
    artist: song.artist,
    list_type: song.list_type as ListType,
    moment: song.moment as Moment,
    url: song.url,
    source: song.source as Source,
    thumbnail_url: song.thumbnail_url,
    notes: song.notes,
  })
  const [urlInput, setUrlInput] = useState(song.url)

  const updateSong = useUpdateSong()
  const fetchUrl = useFetchUrl()

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleFetch() {
    fetchUrl.mutate(urlInput, {
      onSuccess: (meta) => {
        if (meta.title) set('title', meta.title)
        if (meta.artist) set('artist', meta.artist)
        if (meta.thumbnail_url) set('thumbnail_url', meta.thumbnail_url)
        if (meta.source) set('source', meta.source)
        set('url', urlInput)
      },
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateSong.mutate(
      { id: song.id, data: { ...form, url: urlInput } },
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">Edit Song</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>URL (YouTube, Spotify, SoundCloud)</label>
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
                title="Fetch metadata"
                className="px-3 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center"
              >
                {fetchUrl.isPending ? <Loader2 size={13} className="animate-spin" /> : <Link size={13} />}
              </button>
            </div>
            {fetchUrl.isError && (
              <p className="text-xs text-rose-500 mt-1">Could not fetch metadata — fill in manually.</p>
            )}
          </div>

          <form id="edit-song-form" onSubmit={handleSubmit} className="space-y-3">
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="" className="w-full max-h-32 object-cover rounded-lg" />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>List</label>
                <select
                  value={form.list_type}
                  onChange={(e) => set('list_type', e.target.value as ListType)}
                  className={inputCls}
                >
                  <option value="playlist">Playlist</option>
                  <option value="do_not_play">Do Not Play</option>
                </select>
              </div>
              {form.list_type === 'playlist' && (
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
            </div>
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

        <div className="px-5 py-4 border-t border-stone-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-song-form"
            disabled={!form.title || updateSong.isPending}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {updateSong.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
