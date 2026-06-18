import { useEffect, useRef, useState } from 'react'
import { Link2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateIdeaFromUrl, useUploadIdeas } from './api'

type Tab = 'upload' | 'url'

interface AddIdeaModalProps {
  onClose: () => void
}

export function AddIdeaModal({ onClose }: AddIdeaModalProps) {
  const [tab, setTab] = useState<Tab>('upload')
  const [url, setUrl] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const upload = useUploadIdeas()
  const fromUrl = useCreateIdeaFromUrl()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    try {
      await upload.mutateAsync(files)
      toast.success(files.length > 1 ? `${files.length} ideas added` : 'Idea added')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  async function handleUrl() {
    const trimmed = url.trim()
    if (!trimmed) return
    try {
      await fromUrl.mutateAsync(trimmed)
      toast.success('Idea imported')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not import that link')
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      <div className="relative z-10 w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-semibold text-gray-800 text-base">Add idea</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 border-b border-gray-100">
          <button
            onClick={() => setTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Upload size={15} /> Upload
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'url' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Link2 size={15} /> Paste link
          </button>
        </div>

        <div className="p-4">
          {tab === 'upload' ? (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
              <Upload size={24} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                {upload.isPending ? 'Uploading…' : 'Choose image(s)'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={upload.isPending}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500">
                Paste a Pinterest pin link, an image URL, or any page — we'll grab its image.
              </p>
              <input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUrl() }}
                placeholder="https://…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={handleUrl}
                disabled={fromUrl.isPending || !url.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {fromUrl.isPending ? 'Importing…' : 'Import'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
