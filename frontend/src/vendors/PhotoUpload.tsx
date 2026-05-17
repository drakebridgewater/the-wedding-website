import { useEffect, useRef, useState } from 'react'
import { X, Upload, Globe, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VendorPhoto } from './types'
import type { VendorType } from './types'
import { useDeletePhoto, useSetPrimaryPhoto, useScrapePhotos, useUploadPhotos } from './api'

interface Props {
  vendorId: number
  vendorType: VendorType
  photos: VendorPhoto[]
  vendorWebsite?: string
}

function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: VendorPhoto[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [photos.length, onClose])

  const photo = photos[index]

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-3 right-3 p-2 text-white/70 hover:text-white transition-colors"
        onClick={onClose}
      >
        <X size={24} />
      </button>

      {/* Counter */}
      {photos.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          {index + 1} / {photos.length}
        </span>
      )}

      {/* Prev */}
      {photos.length > 1 && (
        <button
          className="absolute left-2 sm:left-4 p-2 text-white/70 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + photos.length) % photos.length) }}
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.url}
        alt={photo.caption || 'Vendor photo'}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {photos.length > 1 && (
        <button
          className="absolute right-2 sm:right-4 p-2 text-white/70 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % photos.length) }}
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Caption */}
      {photo.caption && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm text-center px-4">
          {photo.caption}
        </p>
      )}
    </div>
  )
}

export function PhotoUpload({ vendorId, vendorType, photos, vendorWebsite }: Props) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadPhotos(vendorType)
  const deleteMutation = useDeletePhoto(vendorType)
  const primaryMutation = useSetPrimaryPhoto(vendorType)
  const scrapeMutation = useScrapePhotos(vendorType)

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newPreviews = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }))
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  function removePreview(url: string) {
    URL.revokeObjectURL(url)
    setPreviews((prev) => prev.filter((p) => p.url !== url))
  }

  function uploadAll() {
    if (previews.length === 0) return
    uploadMutation.mutate(
      { id: vendorId, files: previews.map((p) => p.file) },
      { onSuccess: () => setPreviews([]) },
    )
  }

  function scrapeFromWebsite() {
    setScrapeStatus(null)
    scrapeMutation.mutate({ id: vendorId, url: vendorWebsite }, {
      onSuccess: (data) => {
        const n = data.scraped
        setScrapeStatus(n > 0 ? `${n} photo${n !== 1 ? 's' : ''} imported` : 'No photos found on the site')
        setTimeout(() => setScrapeStatus(null), 5000)
      },
      onError: () => {
        setScrapeStatus('Could not fetch photos — check the website URL')
        setTimeout(() => setScrapeStatus(null), 5000)
      },
    })
  }

  return (
    <div className="space-y-3">
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Existing photos */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.url}
                alt={photo.caption || 'Vendor photo'}
                onClick={() => setLightboxIndex(idx)}
                className={cn(
                  'h-20 w-20 object-cover rounded-lg border-2 cursor-pointer hover:opacity-90 transition-opacity',
                  photo.is_primary ? 'border-rose-500' : 'border-gray-200',
                )}
                title={photo.caption || 'Click to enlarge'}
              />

              {/* Current cover badge */}
              {photo.is_primary && (
                <span className="absolute bottom-0 inset-x-0 text-center text-[10px] font-semibold bg-rose-500 text-white rounded-b-lg py-0.5 leading-none pointer-events-none">
                  Cover
                </span>
              )}

              {/* Set as cover — appears on hover for non-primary photos */}
              {!photo.is_primary && (
                <button
                  onClick={(e) => { e.stopPropagation(); primaryMutation.mutate(photo.id) }}
                  disabled={primaryMutation.isPending}
                  title="Set as cover photo"
                  className="absolute bottom-0 inset-x-0 text-center text-[10px] font-medium bg-black/55 text-white rounded-b-lg py-0.5 leading-none opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 flex items-center justify-center gap-0.5"
                >
                  <ImageIcon size={9} />
                  Set cover
                </button>
              )}

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(photo.id) }}
                disabled={deleteMutation.isPending}
                title="Delete photo"
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending upload previews */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((p) => (
            <div key={p.url} className="relative group">
              <img
                src={p.url}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg border-2 border-dashed border-rose-300"
              />
              <button
                onClick={() => removePreview(p.url)}
                className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button
            onClick={uploadAll}
            disabled={uploadMutation.isPending}
            className="h-20 px-4 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Upload size={14} />
            {uploadMutation.isPending ? 'Uploading…' : `Upload ${previews.length}`}
          </button>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-rose-400 hover:text-rose-600 transition-colors"
        >
          <Upload size={14} />
          Add photos
        </button>

        {vendorWebsite && (
          <button
            type="button"
            onClick={scrapeFromWebsite}
            disabled={scrapeMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-rose-400 hover:text-rose-600 transition-colors disabled:opacity-50"
          >
            <Globe size={14} />
            {scrapeMutation.isPending ? 'Fetching…' : 'Fetch from website'}
          </button>
        )}

        {scrapeStatus && (
          <span className="text-xs text-gray-500 italic">{scrapeStatus}</span>
        )}
      </div>

      {photos.length > 1 && (
        <p className="text-xs text-gray-400">Click a photo to enlarge · Hover and click "Set cover" to use it on the vendor card.</p>
      )}
      {photos.length === 1 && (
        <p className="text-xs text-gray-400">Click the photo to enlarge.</p>
      )}
    </div>
  )
}
