import type { AnyVendor, VendorType, VenueVendor, CatererVendor, CakeVendor, FloristVendor, EntertainmentVendor } from './types'
import { VENDOR_LABELS } from './types'
import type { ChecklistItem } from './api'

interface Props {
  vendor: AnyVendor
  vendorType: VendorType
  checklistItems: ChecklistItem[]
}

function fmt(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return ''
  return String(val)
}

function DetailPill({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <span className="inline-block mr-4">
      <span className="font-medium">{label}:</span> {value}
    </span>
  )
}

function BoolPill({ label, value }: { label: string; value: boolean }) {
  if (!value) return null
  return <span className="inline-block mr-3 font-medium">{label}</span>
}

function TypeDetails({ vendor, vendorType }: { vendor: AnyVendor; vendorType: VendorType }) {
  if (vendorType === 'venue') {
    const v = vendor as VenueVendor
    return (
      <p className="text-sm text-gray-700 mt-1">
        <DetailPill label="Capacity" value={v.capacity ? `${v.capacity} guests` : null} />
        <DetailPill label="Style" value={v.style} />
        <BoolPill label="Parking" value={v.has_parking} />
        <BoolPill label="Catering Included" value={v.catering_included} />
        <BoolPill label="Accommodation Nearby" value={v.accommodation_nearby} />
        <BoolPill label="Indoor" value={v.is_indoor} />
        <BoolPill label="Outdoor" value={v.is_outdoor} />
      </p>
    )
  }
  if (vendorType === 'caterer') {
    const v = vendor as CatererVendor
    return (
      <p className="text-sm text-gray-700 mt-1">
        <DetailPill label="Price / head" value={v.price_per_head ? `$${v.price_per_head}` : null} />
        <DetailPill label="Cuisine" value={v.cuisine_type} />
        <BoolPill label="Vegetarian options" value={v.has_vegetarian} />
        <BoolPill label="Vegan options" value={v.has_vegan} />
        <BoolPill label="Gluten-free options" value={v.has_gluten_free} />
      </p>
    )
  }
  if (vendorType === 'cake') {
    const v = vendor as CakeVendor
    return (
      <p className="text-sm text-gray-700 mt-1">
        <DetailPill label="Price / serving" value={v.price_per_serving ? `$${v.price_per_serving}` : null} />
        <DetailPill label="Flavors" value={v.flavors} />
        <BoolPill label="Custom design available" value={v.custom_design_available} />
      </p>
    )
  }
  if (vendorType === 'florist') {
    const v = vendor as FloristVendor
    return (
      <p className="text-sm text-gray-700 mt-1">
        <DetailPill label="Style" value={v.style} />
        <DetailPill label="Min. order" value={v.minimum_order ? `$${v.minimum_order}` : null} />
        <DetailPill label="Arrangements" value={v.arrangement_types} />
      </p>
    )
  }
  if (vendorType === 'entertainment') {
    const v = vendor as EntertainmentVendor
    return (
      <p className="text-sm text-gray-700 mt-1">
        <DetailPill label="Type" value={v.type} />
        <DetailPill label="Members" value={v.num_members ? String(v.num_members) : null} />
        <DetailPill label="Genres" value={v.genres} />
        <DetailPill label="Duration" value={v.performance_duration_hours ? `${v.performance_duration_hours} hrs` : null} />
      </p>
    )
  }
  return null
}

export function VendorPrintSheet({ vendor, vendorType, checklistItems }: Props) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const categories = [...new Set(checklistItems.map((i) => i.category))]

  return (
    <div className="vendor-print-content hidden font-sans text-gray-900 text-sm leading-relaxed">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b-2 border-gray-800 pb-2 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          {VENDOR_LABELS[vendorType]} Visit Sheet
        </h1>
        <span className="text-xs text-gray-500">{today}</span>
      </div>

      {/* Vendor name */}
      <h2 className="text-2xl font-bold mb-3">{vendor.name}</h2>

      {/* Contact details */}
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Contact</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
          {fmt(vendor.phone) && <p><span className="font-medium">Phone:</span> {vendor.phone}</p>}
          {fmt(vendor.email) && <p><span className="font-medium">Email:</span> {vendor.email}</p>}
          {fmt(vendor.website) && <p className="col-span-2"><span className="font-medium">Website:</span> {vendor.website}</p>}
          {fmt(vendor.address) && <p className="col-span-2"><span className="font-medium">Address:</span> {vendor.address}</p>}
        </div>
      </div>

      {/* Details */}
      <div className="mb-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Details</h3>
        <p className="text-sm text-gray-700">
          {vendor.price_estimate && (
            <span className="mr-4"><span className="font-medium">Estimate:</span> ${vendor.price_estimate}</span>
          )}
          {vendor.rating && (
            <span className="mr-4"><span className="font-medium">Rating:</span> {vendor.rating}/5</span>
          )}
        </p>
        <TypeDetails vendor={vendor} vendorType={vendorType} />
      </div>

      {/* Notes */}
      {(vendor.positives || vendor.negatives || vendor.comments) && (
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Notes</h3>
          {vendor.positives && <p className="text-sm"><span className="font-medium">Positives:</span> {vendor.positives}</p>}
          {vendor.negatives && <p className="text-sm"><span className="font-medium">Negatives:</span> {vendor.negatives}</p>}
          {vendor.comments && <p className="text-sm"><span className="font-medium">Comments:</span> {vendor.comments}</p>}
        </div>
      )}

      {/* Checklist questions */}
      {checklistItems.length > 0 && (
        <div>
          <div className="border-t-2 border-gray-800 pt-3 mb-3">
            <h3 className="text-base font-bold uppercase tracking-wide">Questions to Ask</h3>
          </div>
          {categories.map((cat) => {
            const items = checklistItems.filter((i) => i.category === cat)
            return (
              <div key={cat} className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{cat}</h4>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <span className="mt-0.5 flex-shrink-0">□</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.text}</p>
                        {item.question && (
                          <p className="text-xs text-gray-500 italic mb-1">{item.question}</p>
                        )}
                        <div className="border-b border-dotted border-gray-400 mt-2 mb-0.5" />
                        <div className="border-b border-dotted border-gray-300 mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
