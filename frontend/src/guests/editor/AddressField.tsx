import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface AddressPatch {
  address: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  address_country: string
  address_verified: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function component(place: any, type: string, useShort = false): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = (place.address_components || []).find((c: any) => c.types.includes(type))
  return match ? (useShort ? match.short_name : match.long_name) : ''
}

/** Auto-saving address input with Google Places autocomplete when a key is configured.
 *  A Places pick saves the structured components with address_verified=true;
 *  a hand-typed edit clears them. */
export function AddressField({ value, verified, onSave }: {
  value: string
  verified: boolean
  onSave: (patch: AddressPatch) => Promise<unknown>
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  useEffect(() => setDraft(value), [value])

  async function save(patch: AddressPatch) {
    setSaving(true)
    try { await onSaveRef.current(patch) }
    catch { toast.error('Failed to save'); setDraft(value) }
    finally { setSaving(false) }
  }
  const saveRef = useRef(save)
  saveRef.current = save

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
        if (!place.formatted_address) return
        setDraft(place.formatted_address)
        saveRef.current({
          address: place.formatted_address,
          address_street: `${component(place, 'street_number')} ${component(place, 'route')}`.trim(),
          address_city: component(place, 'locality') || component(place, 'sublocality') || component(place, 'postal_town'),
          address_state: component(place, 'administrative_area_level_1', true),
          address_zip: component(place, 'postal_code'),
          address_country: component(place, 'country'),
          address_verified: true,
        })
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

  function commit() {
    if (draft === value) return
    // Hand-typed edits are unverified and invalidate the structured components.
    void save({
      address: draft,
      address_street: '', address_city: '', address_state: '',
      address_zip: '', address_country: '',
      address_verified: false,
    })
  }

  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">
        Address
        {verified && draft === value && (
          <span className="ml-2 text-emerald-600 font-normal">✓ Verified</span>
        )}
      </label>
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
