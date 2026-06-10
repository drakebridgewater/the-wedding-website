import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/** Click-to-edit text shown inside table cells; saves on blur/Enter. */
export function InlineEditCell({ value, onSave, type = 'text' }: {
  value: string
  onSave: (v: string) => Promise<unknown>
  type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  async function commit() {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft); setEditing(false) }
    catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (editing) {
    return (
      <input ref={ref} type={type} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        disabled={saving}
        className="border-b border-stone-400 bg-transparent focus:outline-none min-w-0"
      />
    )
  }
  return (
    <span onClick={() => setEditing(true)}
      className={`cursor-text rounded hover:bg-stone-100 px-0.5 ${saving ? 'opacity-50' : ''}`}>
      {value || <span className="text-stone-300">—</span>}
    </span>
  )
}
