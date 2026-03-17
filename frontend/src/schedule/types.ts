export type MemberRole =
  | 'bride'
  | 'groom'
  | 'maid_of_honor'
  | 'best_man'
  | 'bridesmaid'
  | 'groomsman'
  | 'other'

export type EventCategory =
  | 'getting_ready'
  | 'ceremony'
  | 'photos'
  | 'reception'
  | 'travel'
  | 'meal'
  | 'other'

export interface WeddingPartyMember {
  id: number
  name: string
  role: MemberRole
  role_display: string
  color: string
  email: string
  phone: string
  order: number
}

export interface WeddingPartyGroup {
  id: number
  name: string
  description: string
  color: string
  order: number
  members: WeddingPartyMember[]
}

export interface ScheduleEvent {
  id: number
  day: number
  start_time: string   // "HH:MM:SS"
  duration_minutes: number
  name: string
  location: string
  category: EventCategory
  notes: string
  is_public: boolean
  attendees: WeddingPartyMember[]
  attendee_ids: number[]
  conflicts: number[]  // member IDs that are double-booked
}

export interface ScheduleDay {
  id: number
  date: string         // "YYYY-MM-DD"
  label: string
  order: number
  events: ScheduleEvent[]
}

export interface EventFormData {
  day: number
  start_time: string
  duration_minutes: number
  name: string
  location: string
  category: EventCategory
  notes: string
  is_public: boolean
  attendee_ids: number[]
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  getting_ready: 'Getting Ready',
  ceremony: 'Ceremony',
  photos: 'Photos',
  reception: 'Reception',
  travel: 'Travel',
  meal: 'Meal',
  other: 'Other',
}

// Edit these hex values to customize the category colors throughout the timeline.
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  getting_ready: '#7c3aed',  // violet
  ceremony:      '#db2777',  // pink
  photos:        '#059669',  // emerald
  reception:     '#2563eb',  // blue
  travel:        '#d97706',  // amber
  meal:          '#ea580c',  // orange
  other:         '#475569',  // slate
}
