export type MemberRole =
  | 'bride' | 'groom' | 'maid_of_honor' | 'best_man'
  | 'bridesmaid' | 'groomsman' | 'other'

export type Meal = 'beef' | 'fish' | 'hen' | 'vegetarian' | ''
export type PartyType = 'formal' | 'fun' | 'dimagi' | ''

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

export interface Guest {
  id: number
  first_name: string
  last_name: string
  email: string
  is_attending: boolean | null
  meal: Meal
  is_child: boolean
}

export interface Party {
  id: number
  name: string
  type: PartyType
  category: string
  is_invited: boolean
  is_attending: boolean | null
  rehearsal_dinner: boolean
  comments: string
  guests: Guest[]
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
  is_invited: boolean
  rehearsal_dinner: boolean
  comments: string
}

export interface GuestFormData {
  first_name: string
  last_name: string
  email: string
  is_child: boolean
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
  dimagi: 'Dimagi',
}
