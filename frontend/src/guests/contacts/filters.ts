import type { Guest, Party } from '../types'

export type FilterMode =
  | 'all' | `label:${string}` | 'no_label' | 'rehearsal_dinner' | 'no_rehearsal_dinner'

export function guestMatchesFilter(
  guest: Guest,
  filterMode: FilterMode,
  rehearsalGuestIds: Set<number>,
): boolean {
  if (filterMode === 'all') return true
  if (filterMode === 'no_label') return !guest.label
  if (filterMode === 'rehearsal_dinner') return rehearsalGuestIds.has(guest.id)
  if (filterMode === 'no_rehearsal_dinner') return !rehearsalGuestIds.has(guest.id)
  if (filterMode.startsWith('label:')) return guest.label === filterMode.slice(6)
  return false
}

export function guestMatchesSearch(guest: Guest, party: Party, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(q) ||
    (guest.email?.toLowerCase() ?? '').includes(q) ||
    (guest.label?.toLowerCase() ?? '').includes(q) ||
    party.name.toLowerCase().includes(q)
  )
}

export function visibleGuestsOf(
  party: Party,
  filterMode: FilterMode,
  rehearsalGuestIds: Set<number>,
  searchQuery: string,
): Guest[] {
  if (filterMode === 'all' && !searchQuery) return party.guests
  return party.guests.filter(
    (g) =>
      guestMatchesFilter(g, filterMode, rehearsalGuestIds) &&
      guestMatchesSearch(g, party, searchQuery),
  )
}
