export type VendorType = 'venue' | 'caterer' | 'cake' | 'florist' | 'entertainment'

export interface VendorPhoto {
  id: number
  url: string
  caption: string
  order: number
  uploaded_at: string
}

export interface BaseVendor {
  id: number
  name: string
  website: string
  phone: string
  email: string
  is_chosen: boolean
  is_favorite: boolean
  has_talked_to: boolean
  has_visited: boolean
  price_estimate: string | null
  rating: number | null
  address: string
  latitude: string | null
  longitude: string | null
  positives: string
  negatives: string
  comments: string
  photos: VendorPhoto[]
  created_at: string
  updated_at: string
}

export interface VenueVendor extends BaseVendor {
  capacity: number | null
  style: string
  has_parking: boolean
  catering_included: boolean
  accommodation_nearby: boolean
  is_indoor: boolean
  is_outdoor: boolean
  checklist: string[]
}

export interface CatererVendor extends BaseVendor {
  price_per_head: string | null
  cuisine_type: string
  has_vegetarian: boolean
  has_vegan: boolean
  has_gluten_free: boolean
  tasting_scheduled: boolean
  tasting_completed: boolean
}

export interface CakeVendor extends BaseVendor {
  price_per_serving: string | null
  flavors: string
  custom_design_available: boolean
  tasting_scheduled: boolean
  tasting_completed: boolean
}

export interface FloristVendor extends BaseVendor {
  arrangement_types: string
  style: string
  minimum_order: string | null
}

export interface EntertainmentVendor extends BaseVendor {
  type: string
  num_members: number | null
  genres: string
  package_details: string
  sample_link: string
  performance_duration_hours: string | null
}

export type AnyVendor = VenueVendor | CatererVendor | CakeVendor | FloristVendor | EntertainmentVendor

export const VENDOR_LABELS: Record<VendorType, string> = {
  venue: 'Venue',
  caterer: 'Caterers',
  cake: 'Cake & Bakery',
  florist: 'Florists',
  entertainment: 'Entertainment',
}

export interface CardFieldDef {
  key: string
  label: string
}

// Fields users can toggle on/off in the card preview
const COMMON_CARD_FIELDS: CardFieldDef[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'price_estimate', label: 'Price Estimate' },
  { key: 'is_chosen', label: 'Selected Badge' },
  { key: 'has_talked_to', label: 'Talked To' },
  { key: 'has_visited', label: 'Visited' },
]

const TYPE_CARD_FIELDS: Record<VendorType, CardFieldDef[]> = {
  venue: [
    { key: 'capacity', label: 'Capacity' },
    { key: 'style', label: 'Style' },
    { key: 'has_parking', label: 'Parking' },
    { key: 'catering_included', label: 'Catering Incl.' },
    { key: 'is_indoor', label: 'Indoor' },
    { key: 'is_outdoor', label: 'Outdoor' },
  ],
  caterer: [
    { key: 'price_per_head', label: 'Price / Head' },
    { key: 'cuisine_type', label: 'Cuisine' },
    { key: 'tasting_completed', label: 'Tasting Done' },
  ],
  cake: [
    { key: 'price_per_serving', label: 'Price / Serving' },
    { key: 'flavors', label: 'Flavors' },
    { key: 'tasting_completed', label: 'Tasting Done' },
  ],
  florist: [
    { key: 'style', label: 'Style' },
    { key: 'minimum_order', label: 'Min. Order' },
    { key: 'arrangement_types', label: 'Arrangements' },
  ],
  entertainment: [
    { key: 'type', label: 'Type (DJ/Band)' },
    { key: 'genres', label: 'Genres' },
    { key: 'performance_duration_hours', label: 'Duration (hrs)' },
  ],
}

export function getCardFieldDefs(vendorType: VendorType): CardFieldDef[] {
  return [...COMMON_CARD_FIELDS, ...TYPE_CARD_FIELDS[vendorType]]
}

export const DEFAULT_VISIBLE_FIELDS = new Set([
  'rating', 'price_estimate', 'is_chosen', 'has_talked_to', 'has_visited',
])
