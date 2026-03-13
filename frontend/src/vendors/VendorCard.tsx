import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnyVendor, VendorType } from './types'
import { useUpdateVendor } from './api'

interface Props {
  vendor: AnyVendor
  vendorType: VendorType
  visibleFields: Set<string>
  onClick: () => void
  listView?: boolean
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
        />
      ))}
    </div>
  )
}

// Renders optional type-specific field values as small chips
function FieldChip({ label, value }: { label: string; value: string | number | boolean | null }) {
  if (value === null || value === undefined || value === '' || value === false) return null
  const display = typeof value === 'boolean' ? label : `${label}: ${value}`
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
      {display}
    </span>
  )
}

function TypeSpecificChips({ vendor, vendorType, visibleFields }: {
  vendor: AnyVendor
  vendorType: VendorType
  visibleFields: Set<string>
}) {
  const v = vendor as unknown as Record<string, unknown>

  const candidates: Array<{ key: string; label: string; value: unknown }> = []

  if (vendorType === 'venue') {
    candidates.push(
      { key: 'capacity', label: 'Capacity', value: v.capacity ? `${v.capacity} guests` : null },
      { key: 'style', label: 'Style', value: v.style },
      { key: 'has_parking', label: 'Parking', value: v.has_parking },
      { key: 'catering_included', label: 'Catering Incl.', value: v.catering_included },
      { key: 'is_indoor', label: 'Indoor', value: v.is_indoor },
      { key: 'is_outdoor', label: 'Outdoor', value: v.is_outdoor },
    )
  } else if (vendorType === 'caterer') {
    candidates.push(
      { key: 'price_per_head', label: 'Per head', value: v.price_per_head ? `$${Number(v.price_per_head).toLocaleString()}` : null },
      { key: 'cuisine_type', label: 'Cuisine', value: v.cuisine_type },
      { key: 'tasting_completed', label: 'Tasting done', value: v.tasting_completed },
    )
  } else if (vendorType === 'cake') {
    candidates.push(
      { key: 'price_per_serving', label: 'Per serving', value: v.price_per_serving ? `$${Number(v.price_per_serving).toLocaleString()}` : null },
      { key: 'flavors', label: 'Flavors', value: v.flavors },
      { key: 'tasting_completed', label: 'Tasting done', value: v.tasting_completed },
    )
  } else if (vendorType === 'florist') {
    candidates.push(
      { key: 'style', label: 'Style', value: v.style },
      { key: 'minimum_order', label: 'Min. order', value: v.minimum_order ? `$${Number(v.minimum_order).toLocaleString()}` : null },
      { key: 'arrangement_types', label: 'Arrangements', value: v.arrangement_types },
    )
  } else if (vendorType === 'entertainment') {
    candidates.push(
      { key: 'type', label: 'Type', value: v.type },
      { key: 'genres', label: 'Genres', value: v.genres },
      { key: 'performance_duration_hours', label: 'Duration', value: v.performance_duration_hours ? `${v.performance_duration_hours}h` : null },
    )
  }

  const visible = candidates.filter(c => visibleFields.has(c.key) && c.value)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {visible.map(c => (
        <FieldChip key={c.key} label={c.label} value={c.value as string | number | boolean | null} />
      ))}
    </div>
  )
}

export function VendorCard({ vendor, vendorType, visibleFields, onClick, listView = false }: Props) {
  const updateMutation = useUpdateVendor(vendorType)
  const firstPhoto = vendor.photos[0]

  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    updateMutation.mutate({ id: vendor.id, data: { is_favorite: !vendor.is_favorite } })
  }

  if (listView) {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {firstPhoto ? (
            <img src={firstPhoto.url} alt={vendor.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 text-2xl">
              📷
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">{vendor.name}</span>
            {visibleFields.has('is_chosen') && vendor.is_chosen && (
              <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {visibleFields.has('rating') && <RatingStars rating={vendor.rating} />}
            {visibleFields.has('price_estimate') && vendor.price_estimate && (
              <span className="text-sm text-gray-500">${Number(vendor.price_estimate).toLocaleString()}</span>
            )}
            {visibleFields.has('has_talked_to') && vendor.has_talked_to && (
              <span className="text-xs text-blue-600">Talked to ✓</span>
            )}
            {visibleFields.has('has_visited') && vendor.has_visited && (
              <span className="text-xs text-blue-600">Visited ✓</span>
            )}
          </div>
          <TypeSpecificChips vendor={vendor} vendorType={vendorType} visibleFields={visibleFields} />
        </div>

        <button
          onClick={toggleFavorite}
          className={cn(
            'flex-shrink-0 p-2 rounded-full transition-colors',
            vendor.is_favorite ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400',
          )}
        >
          <Star size={18} className={vendor.is_favorite ? 'fill-amber-400' : ''} />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
    >
      {/* Photo */}
      <div className="relative h-44 bg-gray-100">
        {firstPhoto ? (
          <img src={firstPhoto.url} alt={vendor.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">
            📷
          </div>
        )}

        <button
          onClick={toggleFavorite}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm transition-colors shadow-sm',
            vendor.is_favorite ? 'text-amber-400 hover:text-amber-500' : 'text-gray-400 hover:text-amber-400',
          )}
        >
          <Star size={16} className={vendor.is_favorite ? 'fill-amber-400' : ''} />
        </button>

        {visibleFields.has('is_chosen') && vendor.is_chosen && (
          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 bg-green-500 text-white rounded-full font-medium shadow-sm">
            Selected
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="font-semibold text-base text-gray-900 truncate">{vendor.name}</div>
        <div className="flex items-center justify-between">
          {visibleFields.has('rating') && <RatingStars rating={vendor.rating} />}
          {visibleFields.has('price_estimate') && vendor.price_estimate && (
            <span className="text-sm font-medium text-gray-600">
              ${Number(vendor.price_estimate).toLocaleString()}
            </span>
          )}
        </div>
        {(visibleFields.has('has_talked_to') || visibleFields.has('has_visited')) && (
          <div className="flex gap-2 flex-wrap">
            {visibleFields.has('has_talked_to') && vendor.has_talked_to && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Talked to ✓
              </span>
            )}
            {visibleFields.has('has_visited') && vendor.has_visited && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Visited ✓
              </span>
            )}
          </div>
        )}
        <TypeSpecificChips vendor={vendor} vendorType={vendorType} visibleFields={visibleFields} />
      </div>
    </div>
  )
}
