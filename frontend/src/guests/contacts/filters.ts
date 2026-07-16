import type { Guest, Party } from '../types'

/**
 * Guest-level filters — the ones that ask about an individual guest rather
 * than the party as a unit. Everything party-shaped (comms, address, RSVP,
 * rehearsal dinner) lives in ../partyFilters.
 */
export type FilterMode = 'all' | `label:${string}` | 'no_label'

export function guestMatchesFilter(guest: Guest, filterMode: FilterMode): boolean {
  if (filterMode === 'all') return true
  if (filterMode === 'no_label') return !guest.label
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

export function visibleGuestsOf(party: Party, filterMode: FilterMode, searchQuery: string): Guest[] {
  if (filterMode === 'all' && !searchQuery) return party.guests
  return party.guests.filter(
    (g) => guestMatchesFilter(g, filterMode) && guestMatchesSearch(g, party, searchQuery),
  )
}
