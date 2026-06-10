import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { useEnterSubmit } from '../hooks/useEnterSubmit'

interface ImportStats {
  parties_created: number
  parties_updated: number
  guests_created: number
  guests_updated: number
  skipped: number
}

export function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()
  useEnterSubmit(() => { if (result) { onClose() } else { handleImport() } }, loading || (!file && !result))

  async function handleImport() {
    if (!file) return
    setLoading(true); setError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/guests/api/import-csv/', {
        method: 'POST',
        headers: { 'X-CSRFToken': (document.cookie.match(/csrftoken=([^;]+)/) ?? [])[1] ?? '' },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult(data as ImportStats)
      qc.invalidateQueries({ queryKey: ['guests', 'parties'] })
      qc.invalidateQueries({ queryKey: ['guests', 'unassigned'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Import Guests from CSV"
      onClose={onClose}
      size="md"
      footer={result ? (
        <Button variant="primary" className="w-full" onClick={onClose}>Done</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleImport} disabled={!file || loading}>
            {loading ? 'Importing…' : 'Import'}
          </Button>
        </>
      )}
    >
      {result ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-700">Import complete!</p>
          <ul className="text-sm text-stone-600 space-y-1">
            {(result.parties_created > 0 || result.parties_updated > 0) && (
              <li>{result.parties_created} parties created, {result.parties_updated} updated</li>
            )}
            <li>{result.guests_created} guests created, {result.guests_updated} updated</li>
            {result.skipped > 0 && <li className="text-amber-600">{result.skipped} rows skipped</li>}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-500 space-y-1">
              <p className="font-medium text-stone-700">Google Contacts export</p>
              <p>Export from <span className="font-mono">contacts.google.com</span> → More actions → Export → Google CSV.</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-500 space-y-1">
              <p className="font-medium text-stone-700">Native format</p>
              <p className="font-mono">first_name, last_name, is_child, category, is_invited, email</p>
            </div>
            <p className="text-xs text-stone-400">Format is detected automatically from the header row.</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-stone-300 rounded-lg py-6 text-sm text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors">
              {file ? <span className="text-stone-700 font-medium">{file.name}</span>
                    : <span>Tap to choose a .csv file</span>}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
