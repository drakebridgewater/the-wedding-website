import { useRef, useState } from 'react'
import { FileText, FileImage, File, ExternalLink, Download, Pencil, X, Upload, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VendorDocument, VendorType } from './types'
import { useUploadDocument, useDeleteDocument, useRenameDocument } from './api'

interface Props {
  vendorId: number
  vendorType: VendorType
  documents: VendorDocument[]
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <FileImage size={18} className="text-blue-400 flex-shrink-0" />
  if (mimeType === 'application/pdf') return <FileText size={18} className="text-red-400 flex-shrink-0" />
  return <File size={18} className="text-gray-400 flex-shrink-0" />
}

function DocRow({
  doc,
  vendorType,
}: {
  doc: VendorDocument
  vendorType: VendorType
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(doc.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameMutation = useRenameDocument(vendorType)
  const deleteMutation = useDeleteDocument(vendorType)

  function startEdit() {
    setDraftName(doc.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitRename() {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== doc.name) {
      renameMutation.mutate({ id: doc.id, name: trimmed })
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
      <DocIcon mimeType={doc.mime_type} />

      {/* Name — editable inline */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            className="w-full text-sm border border-rose-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-rose-400"
          />
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-sm text-gray-800 truncate">{doc.name}</span>
            {doc.file_size != null && (
              <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(doc.file_size)}</span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={cn('flex items-center gap-0.5 transition-opacity', editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 sm:opacity-100')}>
        {editing ? (
          <button
            type="button"
            onClick={commitRename}
            className="p-2 text-green-600 hover:text-green-700 rounded transition-colors"
            title="Save name"
          >
            <Check size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            disabled={renameMutation.isPending}
            className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Rename"
          >
            <Pencil size={14} />
          </button>
        )}
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in browser"
          className="p-2 text-gray-400 hover:text-blue-600 rounded transition-colors"
        >
          <ExternalLink size={14} />
        </a>
        <a
          href={doc.url}
          download={doc.name}
          title="Download"
          className="p-2 text-gray-400 hover:text-blue-600 rounded transition-colors"
        >
          <Download size={14} />
        </a>
        <button
          type="button"
          onClick={() => deleteMutation.mutate(doc.id)}
          disabled={deleteMutation.isPending}
          title="Delete document"
          className="p-2 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-30"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export function DocumentManager({ vendorId, vendorType, documents }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingName, setPendingName] = useState('')
  const uploadMutation = useUploadDocument(vendorType)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Pre-fill name from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
    setPendingFile(file)
    setPendingName(nameWithoutExt)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function handleUpload() {
    if (!pendingFile) return
    const name = pendingName.trim() || pendingFile.name
    uploadMutation.mutate(
      { id: vendorId, file: pendingFile, name },
      {
        onSuccess: () => {
          setPendingFile(null)
          setPendingName('')
        },
      },
    )
  }

  function cancelPending() {
    setPendingFile(null)
    setPendingName('')
  }

  return (
    <div className="space-y-2">
      {/* Existing documents */}
      {documents.length > 0 ? (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {documents.map((doc) => (
            <DocRow key={doc.id} doc={doc} vendorType={vendorType} />
          ))}
        </div>
      ) : (
        !pendingFile && (
          <p className="text-sm text-gray-400 text-center py-4">No documents uploaded yet.</p>
        )
      )}

      {/* Pending upload — name editor */}
      {pendingFile && (
        <div className="border border-dashed border-rose-300 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DocIcon mimeType={pendingFile.type} />
            <span className="truncate flex-1 min-w-0">{pendingFile.name}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(pendingFile.size)}</span>
          </div>
          <div className="flex gap-2">
            <input
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              placeholder="Document name…"
              className="flex-1 min-w-0 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
              onKeyDown={(e) => { if (e.key === 'Enter') handleUpload() }}
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-600 text-white font-medium rounded-md hover:bg-rose-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Upload size={13} />
              {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={cancelPending}
              disabled={uploadMutation.isPending}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors flex-shrink-0"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!pendingFile && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-rose-400 hover:text-rose-600 transition-colors"
          >
            <Upload size={14} />
            Add document
          </button>
        </>
      )}
    </div>
  )
}
