import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/** Auto-saving address input with Google Places autocomplete when a key is configured. */
export function AddressField({ value, onSave }: { value: string; onSave: (v: string) => Promise<unknown> }) {
  const ref = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    const key = document.querySelector<HTMLMetaElement>('meta[name="google-places-key"]')?.content
    if (!key || !ref.current) return
    function init() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!ref.current || !(window as any).google?.maps?.places) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ac = new (window as any).google.maps.places.Autocomplete(ref.current, { types: ['address'] })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place.formatted_address) setDraft(place.formatted_address)
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps?.places) { init() }
    else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__gplacesReady = init
      const scriptId = '__gplaces_loader__'
      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script')
        s.id = scriptId
        s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__gplacesReady`
        s.async = true
        document.head.appendChild(s)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function commit() {
    if (draft === value) return
    setSaving(true)
    try { await onSave(draft) }
    catch { toast.error('Failed to save'); setDraft(value) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">Address</label>
      <input
        ref={ref}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder="123 Main St…"
        className={`w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 ${saving ? 'opacity-60' : ''}`}
      />
    </div>
  )
}
