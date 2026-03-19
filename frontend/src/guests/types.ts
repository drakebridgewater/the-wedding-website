export type MemberRole =
  | 'bride' | 'groom' | 'maid_of_honor' | 'best_man'
  | 'bridesmaid' | 'groomsman' | 'other'

export type Meal = 'beef' | 'fish' | 'hen' | 'vegetarian' | ''
export type PartyType = 'formal' | 'fun' | 'family' | 'work' | ''

export interface WeddingPartyMember {
  id: number
  name: string
  role: MemberRole
  role_display: string
  color: string
  email: string
  phone: string
  order: number
  guest_id: number | null
}

export interface WeddingPartyGroup {
  id: number
  name: string
  description: string
  color: string
  order: number
  members: WeddingPartyMember[]
}

export type PartySide = 'bride' | 'groom' | 'both' | ''
export type InviteStatus = 'planned' | 'invited' | 'not_invited'

export interface Guest {
  id: number
  party_id: number | null
  first_name: string
  last_name: string
  email: string
  is_attending: boolean | null
  meal: Meal
  is_child: boolean
  dietary_restrictions: string
}

export interface Party {
  id: number
  name: string
  type: PartyType
  category: string
  status: InviteStatus
  is_attending: boolean | null
  rehearsal_dinner: boolean
  comments: string
  guests: Guest[]
  address: string
  side: PartySide
  plus_one_allowed: boolean
  plus_one_count: number
  rsvp_responded_at: string | null
  invitation_id: string
  invitation_sent: string | null
  invitation_opened: string | null
}

export interface EmailTemplate {
  id: number
  name: string
  subject: string
  body_html: string
  created_at: string
  updated_at: string
}

export interface SentEmail {
  id: number
  template_id: number | null
  template_name: string | null
  party_id: number | null
  party_name: string | null
  subject: string
  body_html: string
  recipients: string[]
  sent_at: string
}

export interface MemberFormData {
  name: string
  role: MemberRole
  color: string
  email: string
  phone: string
  order: number
}

export interface GroupFormData {
  name: string
  description: string
  color: string
  order: number
  member_ids: number[]
}

export interface PartyFormData {
  name: string
  type: PartyType
  category: string
  status: InviteStatus
  rehearsal_dinner: boolean
  comments: string
  address: string
  side: PartySide
  plus_one_allowed: boolean
  plus_one_count: number
}

export interface GuestFormData {
  first_name: string
  last_name: string
  email: string
  is_child: boolean
  dietary_restrictions: string
}

export const ROLE_ORDER: MemberRole[] = [
  'bride', 'groom', 'maid_of_honor', 'best_man', 'bridesmaid', 'groomsman', 'other',
]

export const ROLE_LABELS: Record<MemberRole, string> = {
  bride: 'Bride',
  groom: 'Groom',
  maid_of_honor: 'Maid of Honor',
  best_man: 'Best Man',
  bridesmaid: 'Bridesmaid',
  groomsman: 'Groomsman',
  other: 'Other',
}

export const MEAL_LABELS: Record<string, string> = {
  '': '—',
  beef: 'Beef',
  fish: 'Fish',
  hen: 'Chicken',
  vegetarian: 'Vegetarian',
}

export const PARTY_TYPE_LABELS: Record<string, string> = {
  '': 'None',
  formal: 'Formal',
  fun: 'Fun',
  family: 'Family',
  work: 'Work',
}

// Used as tooltips wherever the type badge or select is shown.
export const PARTY_TYPE_DESCRIPTIONS: Record<string, string> = {
  formal: 'Elders, distant relatives, or professional contacts — formal invitation wording.',
  fun: 'Close friends and your casual circle — relaxed, playful invitation tone.',
  family: 'Family members — useful for grouping and seating.',
  work: 'Work colleagues and professional contacts.',
}

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  planned: 'Planned',
  invited: 'Invited',
  not_invited: 'Not invited',
}

export const INVITE_STATUS_COLORS: Record<InviteStatus, string> = {
  planned: 'bg-amber-100 text-amber-700',
  invited: 'bg-emerald-100 text-emerald-700',
  not_invited: 'bg-stone-100 text-stone-400',
}

export const PARTY_SIDE_LABELS: Record<string, string> = {
  '': 'None',
  bride: "Bride's side",
  groom: "Groom's side",
  both: 'Both',
}
