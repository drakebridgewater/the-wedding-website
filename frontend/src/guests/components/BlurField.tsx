import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/** Auto-saving field: edits locally, persists on blur, reverts on failure. */
export function BlurField({
  label, value, onSave, type = 'text', placeholder, textarea,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<unknown>
  type?: string
  placeholder?: string
  textarea?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(value), [value])

  async function commit() {
    if (draft === value) return
    setSaving(true)
    try { await onSave(draft) }
    catch { toast.error('Failed to save'); setDraft(value) }
    finally { setSaving(false) }
  }

  const cls = cn(
    'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400',
    saving && 'opacity-60',
  )

  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          rows={2}
          className={cn(cls, 'resize-none')}
        />
      ) : (
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  )
}
