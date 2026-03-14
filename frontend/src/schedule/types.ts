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
  order: number
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

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  getting_ready: '#a78bfa',
  ceremony:      '#f472b6',
  photos:        '#34d399',
  reception:     '#60a5fa',
  travel:        '#fbbf24',
  meal:          '#fb923c',
  other:         '#94a3b8',
}
