import type { FilterSection } from './components/FilterMenu'
import type { Party } from './types'

/**
 * Party-level filters, shared by the Contacts tab and the email Send panel.
 *
 * These sit on a different axis from the guest-level filters in
 * contacts/filters.ts: they ask about the party as a unit (did they open it,
 * do we have somewhere to mail them) rather than about an individual guest.
 */

export type PartyFilterId =
  | 'std_sent' | 'std_opened' | 'std_unopened'
  | 'inv_sent' | 'inv_opened' | 'inv_unopened'
  | 'rd_invited' | 'rd_not_invited'
  | 'no_email' | 'no_address' | 'address_unverified'
  | 'rsvp_yes' | 'rsvp_no' | 'rsvp_pending'

export type PartyFilterGroup = 'std' | 'inv' | 'rd' | 'contact' | 'rsvp'

/** At most one filter per group; the chosen filters are ANDed together. */
export type PartyFilterState = Partial<Record<PartyFilterGroup, PartyFilterId>>

export const PARTY_FILTER_GROUP_LABELS: Record<PartyFilterGroup, string> = {
  std: 'Save the Date',
  inv: 'Invitation',
  rd: 'Rehearsal dinner',
  contact: 'Contact info',
  rsvp: 'RSVP',
}

export interface PartyFilterDef {
  id: PartyFilterId
  label: string
  title: string
  group: PartyFilterGroup
  test: (party: Party) => boolean
}

export function partyHasEmail(party: Party): boolean {
  return party.guests.some((g) => (g.email ?? '').trim() !== '')
}

export function partyHasAddress(party: Party): boolean {
  return (party.address ?? '').trim() !== ''
}

export const PARTY_FILTERS: PartyFilterDef[] = [
  {
    id: 'std_sent', label: 'STD sent', group: 'std',
    title: 'Save the Date has been sent to this party.',
    test: (p) => !!p.save_the_date_sent,
  },
  {
    id: 'std_opened', label: 'STD opened', group: 'std',
    title: 'Someone in this party opened their Save the Date link.',
    test: (p) => !!p.save_the_date_opened,
  },
  {
    id: 'std_unopened', label: 'STD not opened', group: 'std',
    title: 'Save the Date was sent but nobody has opened the link yet.',
    test: (p) => !!p.save_the_date_sent && !p.save_the_date_opened,
  },
  {
    id: 'inv_sent', label: 'Invite sent', group: 'inv',
    title: 'Invitation has been sent to this party.',
    test: (p) => !!p.invitation_sent,
  },
  {
    id: 'inv_opened', label: 'Invite opened', group: 'inv',
    title: 'Someone in this party opened their invitation link.',
    test: (p) => !!p.invitation_opened,
  },
  {
    id: 'inv_unopened', label: 'Invite not opened', group: 'inv',
    title: 'Invitation was sent but nobody has opened the link yet.',
    test: (p) => !!p.invitation_sent && !p.invitation_opened,
  },
  {
    id: 'rd_invited', label: 'Invited', group: 'rd',
    title: 'This party is invited to the rehearsal dinner.',
    test: (p) => p.rehearsal_dinner,
  },
  {
    id: 'rd_not_invited', label: 'Not invited', group: 'rd',
    title: 'This party is not invited to the rehearsal dinner.',
    test: (p) => !p.rehearsal_dinner,
  },
  {
    id: 'no_email', label: 'No email', group: 'contact',
    title: 'No guest in this party has an email address — they can’t be emailed.',
    test: (p) => !partyHasEmail(p),
  },
  {
    id: 'no_address', label: 'No address', group: 'contact',
    title: 'No mailing address on file — a physical card can’t be posted.',
    test: (p) => !partyHasAddress(p),
  },
  {
    id: 'address_unverified', label: 'Address unverified', group: 'contact',
    title: 'Address was typed by hand rather than picked from a Google Places suggestion.',
    test: (p) => partyHasAddress(p) && !p.address_verified,
  },
  {
    id: 'rsvp_yes', label: 'RSVP yes', group: 'rsvp',
    title: 'At least one guest in this party is attending.',
    test: (p) => p.is_attending === true,
  },
  {
    id: 'rsvp_no', label: 'RSVP no', group: 'rsvp',
    title: 'This party declined.',
    test: (p) => p.is_attending === false,
  },
  {
    id: 'rsvp_pending', label: 'No RSVP yet', group: 'rsvp',
    title: 'This party hasn’t responded either way.',
    test: (p) => p.is_attending === null,
  },
]

export const PARTY_FILTER_BY_ID = new Map(PARTY_FILTERS.map((f) => [f.id, f]))

/** True when the party satisfies every group's selected filter. */
export function partyMatchesFilters(party: Party, state: PartyFilterState): boolean {
  return Object.values(state).every((id) => PARTY_FILTER_BY_ID.get(id)?.test(party) ?? true)
}

export function countActiveFilters(state: PartyFilterState): number {
  return Object.values(state).filter(Boolean).length
}

const GROUP_ORDER: PartyFilterGroup[] = ['std', 'inv', 'rd', 'contact', 'rsvp']

/** The party-level sections for a FilterMenu, counted against `parties`. */
export function buildPartyFilterSections(
  parties: Party[],
  state: PartyFilterState,
  onChange: (next: PartyFilterState) => void,
): FilterSection[] {
  return GROUP_ORDER.map((group) => ({
    id: group,
    label: PARTY_FILTER_GROUP_LABELS[group],
    value: state[group] ?? null,
    options: PARTY_FILTERS.filter((f) => f.group === group).map((f) => ({
      id: f.id,
      label: f.label,
      title: f.title,
      count: parties.filter(f.test).length,
    })),
    onChange: (id: string | null) =>
      onChange({ ...state, [group]: (id as PartyFilterId | null) ?? undefined }),
  }))
}

/** Search across the party name, its guests, and its address. */
export function partyMatchesSearch(party: Party, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (party.name.toLowerCase().includes(q)) return true
  if ((party.address ?? '').toLowerCase().includes(q)) return true
  return party.guests.some(
    (g) =>
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) ||
      (g.email ?? '').toLowerCase().includes(q) ||
      (g.phone ?? '').toLowerCase().includes(q),
  )
}
