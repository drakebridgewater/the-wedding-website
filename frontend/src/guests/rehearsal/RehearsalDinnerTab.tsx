import { useMemo } from 'react'
import { useParties } from '../api'
import { MEAL_LABELS } from '../types'
import { AttendingBadge, Badge, GuestFlags } from '../components/badges'
import { EmptyState } from '../components/EmptyState'

/** Read-only roster of everyone whose party is invited to the rehearsal dinner. */
export function RehearsalDinnerTab({
  onOpenGuest,
}: {
  onOpenGuest: (partyId: number, guestId: number) => void
}) {
  const { data: parties = [], isLoading } = useParties()

  const rehearsalParties = useMemo(
    () => parties.filter((p) => p.rehearsal_dinner),
    [parties],
  )

  const totalGuests = rehearsalParties.reduce((n, p) => n + p.guests.length, 0)

  if (isLoading) {
    return <p className="text-sm text-stone-400 py-8 text-center">Loading…</p>
  }

  if (rehearsalParties.length === 0) {
    return (
      <EmptyState
        message="No parties are marked for the rehearsal dinner."
        hint={'Enable "Rehearsal dinner" on a party in the Contacts tab to add them here.'}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-stone-700">Rehearsal Dinner Guests</h2>
        <Badge tone="rose" className="text-xs">
          {totalGuests} {totalGuests === 1 ? 'person' : 'people'}
        </Badge>
        <span className="text-xs text-stone-400">across {rehearsalParties.length} {rehearsalParties.length === 1 ? 'party' : 'parties'}</span>
      </div>

      {rehearsalParties.map((party) => (
        <div key={party.id} className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
          {/* Party header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50">
            <span className="text-sm font-semibold text-stone-800">{party.name}</span>
            <span className="text-xs text-stone-400">
              {party.guests.length} {party.guests.length === 1 ? 'guest' : 'guests'}
            </span>
          </div>

          {party.guests.length === 0 ? (
            <p className="px-4 py-3 text-xs text-stone-400 italic">No guests in this party yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left px-4 py-2.5 text-stone-500 font-medium">Name</th>
                    <th className="text-left px-3 py-2.5 text-stone-500 font-medium hidden sm:table-cell">Label</th>
                    <th className="text-left px-3 py-2.5 text-stone-500 font-medium">Attending</th>
                    <th className="text-left px-3 py-2.5 text-stone-500 font-medium hidden sm:table-cell">Meal</th>
                    <th className="text-left px-3 py-2.5 text-stone-500 font-medium">Dietary Restrictions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {party.guests.map((guest) => (
                    <tr
                      key={guest.id}
                      onClick={() => onOpenGuest(party.id, guest.id)}
                      className="hover:bg-stone-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-stone-800 font-medium">
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="hover:underline">
                            {guest.first_name} {guest.last_name}
                          </span>
                          <GuestFlags guest={guest} />
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {guest.label
                          ? <Badge>{guest.label}</Badge>
                          : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <AttendingBadge value={guest.is_attending} />
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell text-stone-500">
                        {MEAL_LABELS[guest.meal ?? ''] || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-stone-600">
                        {guest.dietary_restrictions || <span className="text-stone-300">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
