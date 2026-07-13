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
function component(components: any[], type: string, useShort = false): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = (components || []).find((c: any) => c.types.includes(type))
  return match ? (useShort ? match.shortText : match.longText) : ''
}

interface Suggestion {
  text: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prediction: any
}

/** Auto-saving address input with Google Places autocomplete when a key is configured.
 *  A Places pick saves the structured components with address_verified=true;
 *  a hand-typed edit clears them.
 *  Renders its own dropdown on top of google.maps.places.AutocompleteSuggestion
 *  rather than the legacy google.maps.places.Autocomplete widget — Google
 *  stopped fixing bugs in that widget for keys/projects created after March
 *  2025 (predictions silently stalling after the first keystroke is one of them). */
export function AddressField({ value, verified, onSave }: {
  value: string
  verified: boolean
  onSave: (patch: AddressPatch) => Promise<unknown>
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placesRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionTokenRef = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const key = document.querySelector<HTMLMetaElement>('meta[name="google-places-key"]')?.content
    if (!key) return
    let cancelled = false
    async function init() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const places = await (window as any).google.maps.importLibrary('places')
      if (cancelled) return
      placesRef.current = places
      sessionTokenRef.current = new places.AutocompleteSessionToken()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps?.importLibrary) { void init() }
    else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__gplacesReady = () => { void init() }
      const scriptId = '__gplaces_loader__'
      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script')
        s.id = scriptId
        s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__gplacesReady&loading=async`
        s.async = true
        document.head.appendChild(s)
      }
    }
    return () => { cancelled = true }
  }, [])

  function handleChange(next: string) {
    setDraft(next)
    setSuggestions([])
    clearTimeout(debounceRef.current)
    const query = next.trim()
    if (!query || !placesRef.current) return
    debounceRef.current = setTimeout(() => {
      const { AutocompleteSuggestion } = placesRef.current
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
        sessionToken: sessionTokenRef.current,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).then((res: any) => {
        // Drop stale responses from a query that's since been edited/cleared.
        if (ref.current?.value.trim() !== query) return
        setSuggestions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res.suggestions || []).flatMap((s: any) => (s.placePrediction ? [{
            text: s.placePrediction.text?.text ?? '',
            prediction: s.placePrediction,
          }] : []))
        )
      }).catch(() => setSuggestions([]))
    }, 200)
  }

  async function selectSuggestion(suggestion: Suggestion) {
    setSuggestions([])
    try {
      const place = suggestion.prediction.toPlace()
      await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] })
      const comps = place.addressComponents || []
      const address = place.formattedAddress || suggestion.text
      setDraft(address)
      await saveRef.current({
        address,
        address_street: `${component(comps, 'street_number')} ${component(comps, 'route')}`.trim(),
        address_city: component(comps, 'locality') || component(comps, 'sublocality') || component(comps, 'postal_town'),
        address_state: component(comps, 'administrative_area_level_1', true),
        address_zip: component(comps, 'postal_code'),
        address_country: component(comps, 'country'),
        address_verified: true,
      })
    } finally {
      // A place was resolved, so start a fresh billing session for the next lookup.
      if (placesRef.current) sessionTokenRef.current = new placesRef.current.AutocompleteSessionToken()
    }
  }

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
    <div className="relative">
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
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => { setTimeout(() => setSuggestions([]), 150); commit() }}
        placeholder="123 Main St…"
        autoComplete="off"
        className={`w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 ${saving ? 'opacity-60' : ''}`}
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              // mousedown (not click) fires before the input's blur handler,
              // so preventDefault here keeps focus and the selection lands
              // before commit() would otherwise fire on blur.
              onMouseDown={(e) => { e.preventDefault(); void selectSuggestion(s) }}
              className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
