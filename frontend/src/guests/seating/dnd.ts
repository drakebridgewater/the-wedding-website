import type { SeatingGuest } from '../types'

// ── Drag data shapes ──────────────────────────────────────────────────────────

export interface DragGuest {
  type: 'guest'
  guestId: number
  currentTableId: number | null
}

export interface DragParty {
  type: 'party'
  partyId: number
  guestIds: number[]
  partyName: string
  plusOneCount: number
}

export type DragData = DragGuest | DragParty
export type DropTarget = { type: 'table'; tableId: number } | { type: 'unseated' }

// ── Party grouping ────────────────────────────────────────────────────────────

export interface PartyGroup {
  key: string
  partyId: number | null
  partyName: string
  guests: SeatingGuest[]
  plusOneCount: number
}

export function groupByParty(guests: SeatingGuest[]): PartyGroup[] {
  const map = new Map<string, PartyGroup>()
  for (const g of guests) {
    const key = g.party_id !== null ? `party-${g.party_id}` : `solo-${g.id}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        partyId: g.party_id,
        partyName: g.party_name ?? `${g.first_name} ${g.last_name}`,
        guests: [],
        plusOneCount: g.party_plus_one_count ?? 0,
      })
    }
    map.get(key)!.guests.push(g)
  }
  return Array.from(map.values()).sort((a, b) => a.partyName.localeCompare(b.partyName))
}
