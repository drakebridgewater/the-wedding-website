import { useEffect, useRef, useState } from 'react'
import { X, Upload } from 'lucide-react'
import type { VendorPhoto } from './types'
import type { VendorType } from './types'
import { useDeletePhoto, useUploadPhotos } from './api'

interface Props {
  vendorId: number
  vendorType: VendorType
  photos: VendorPhoto[]
}

export function PhotoUpload({ vendorId, vendorType, photos }: Props) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadPhotos(vendorType)
  const deleteMutation = useDeletePhoto(vendorType)

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

  return (
    <div className="space-y-3">
      {/* Existing photos */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.url}
                alt={photo.caption || 'Vendor photo'}
                className="h-20 w-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => deleteMutation.mutate(photo.id)}
                disabled={deleteMutation.isPending}
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

      {/* File picker */}
      <div>
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
      </div>
    </div>
  )
}
