import type { AnyVendor, VendorType, VenueVendor, CatererVendor, CakeVendor, FloristVendor, EntertainmentVendor } from './types'
import { VENDOR_LABELS } from './types'
import type { ChecklistItem } from './api'

interface Props {
  vendor: AnyVendor
  vendorType: VendorType
  checklistItems: ChecklistItem[]
}

function pill(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  return `${label}: ${value}`
}

function flag(label: string, value: boolean) {
  return value ? label : null
}

function typeDetailParts(vendor: AnyVendor, vendorType: VendorType): string[] {
  const parts: (string | null)[] = []
  if (vendorType === 'venue') {
    const v = vendor as VenueVendor
    parts.push(
      pill('Capacity', v.capacity ? `${v.capacity} guests` : null),
      pill('Style', v.style),
      flag('Parking', v.has_parking),
      flag('Catering incl.', v.catering_included),
      flag('Accommodation nearby', v.accommodation_nearby),
      flag('Indoor', v.is_indoor),
      flag('Outdoor', v.is_outdoor),
    )
  } else if (vendorType === 'caterer') {
    const v = vendor as CatererVendor
    parts.push(
      pill('$/head', v.price_per_head),
      pill('Cuisine', v.cuisine_type),
      flag('Vegetarian', v.has_vegetarian),
      flag('Vegan', v.has_vegan),
      flag('Gluten-free', v.has_gluten_free),
    )
  } else if (vendorType === 'cake') {
    const v = vendor as CakeVendor
    parts.push(
      pill('$/serving', v.price_per_serving),
      pill('Flavors', v.flavors),
      flag('Custom design', v.custom_design_available),
    )
  } else if (vendorType === 'florist') {
    const v = vendor as FloristVendor
    parts.push(
      pill('Style', v.style),
      pill('Min. order', v.minimum_order ? `$${v.minimum_order}` : null),
      pill('Arrangements', v.arrangement_types),
    )
  } else if (vendorType === 'entertainment') {
    const v = vendor as EntertainmentVendor
    parts.push(
      pill('Type', v.type),
      pill('Members', v.num_members),
      pill('Genres', v.genres),
      pill('Duration', v.performance_duration_hours ? `${v.performance_duration_hours} hrs` : null),
    )
  }
  return parts.filter(Boolean) as string[]
}

export function VendorPrintSheet({ vendor, vendorType, checklistItems }: Props) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const categories = [...new Set(checklistItems.map((i) => i.category))]
  const typeDetails = typeDetailParts(vendor, vendorType)

  const contactParts = [
    vendor.phone && `☎ ${vendor.phone}`,
    vendor.email && `✉ ${vendor.email}`,
    vendor.website && vendor.website,
  ].filter(Boolean) as string[]

  return (
    <div className="vendor-print-content hidden font-sans text-gray-900" style={{ fontSize: '10pt', lineHeight: '1.3' }}>

      {/* Header */}
      <div style={{ borderBottom: '1.5px solid #111', paddingBottom: '4px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 700, fontSize: '13pt', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {VENDOR_LABELS[vendorType]} Visit Sheet
        </span>
        <span style={{ fontSize: '8pt', color: '#666' }}>{today}</span>
      </div>

      {/* Vendor name */}
      <div style={{ fontSize: '15pt', fontWeight: 700, marginBottom: '5px' }}>{vendor.name}</div>

      {/* Contact + details in one tight block */}
      <div style={{ marginBottom: '8px', fontSize: '9pt', color: '#333' }}>
        {contactParts.length > 0 && (
          <div>{contactParts.join('  ·  ')}</div>
        )}
        {vendor.address && (
          <div>{vendor.address}</div>
        )}
        {(vendor.price_estimate || vendor.rating || typeDetails.length > 0) && (
          <div style={{ marginTop: '2px' }}>
            {[
              vendor.price_estimate && `Est. $${vendor.price_estimate}`,
              vendor.rating && `Rating: ${vendor.rating}/5`,
              ...typeDetails,
            ].filter(Boolean).join('  ·  ')}
          </div>
        )}
        {(vendor.positives || vendor.negatives || vendor.comments) && (
          <div style={{ marginTop: '2px', color: '#555' }}>
            {[
              vendor.positives && `+ ${vendor.positives}`,
              vendor.negatives && `− ${vendor.negatives}`,
              vendor.comments && vendor.comments,
            ].filter(Boolean).join('  ·  ')}
          </div>
        )}
      </div>

      {/* Questions */}
      {checklistItems.length > 0 && (
        <div>
          <div style={{ borderTop: '1.5px solid #111', paddingTop: '4px', marginBottom: '6px', fontWeight: 700, fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Questions to Ask
          </div>
          {categories.map((cat) => {
            const items = checklistItems.filter((i) => i.category === cat)
            return (
              <div key={cat} style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '7.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '3px' }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, marginTop: '1px' }}>□</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '9pt' }}>{item.text}</div>
                        {item.question && (
                          <div style={{ fontSize: '7.5pt', color: '#666', fontStyle: 'italic', marginBottom: '1px' }}>{item.question}</div>
                        )}
                        <div style={{ borderBottom: '0.75px dotted #aaa', marginTop: '2px' }} />
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
