import { useEffect, useRef } from 'react'

interface Props {
  lat: number
  lng: number
}

export function LocationMap({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let map: import('leaflet').Map | null = null

    import('leaflet').then((mod) => {
      const L = mod.default
      // Fix Leaflet default marker icon broken by Vite bundling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
      })

      if (!containerRef.current) return
      map = L.map(containerRef.current).setView([lat, lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)
      L.marker([lat, lng]).addTo(map)
    })

    return () => {
      map?.remove()
    }
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-gray-200"
      style={{ height: 260, zIndex: 0 }}
    />
  )
}
