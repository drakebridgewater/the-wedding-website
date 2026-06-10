import { useMemo } from 'react'
import { createColumnHelper, type VisibilityState } from '@tanstack/react-table'
import { DataTable } from '../components/DataTable'
import { Badge, AttendingBadge, GuestFlags } from '../components/badges'
import type { Guest, Party, InviteStatus, WeddingPartyMember } from '../types'
import { MEAL_LABELS, INVITE_STATUS_LABELS, INVITE_STATUS_COLORS } from '../types'

export type FlatRow = { guest: Guest; party: Party }

const columnHelper = createColumnHelper<FlatRow>()

const DEFAULT_COLUMNS: VisibilityState = {
  name: true,
  label: true,
  party: true,
  email: true,
  attending: true,
  meal: true,
  dietary: true,
  status: false,
  category: false,
}

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name', label: 'Label', party: 'Party', category: 'Category',
  email: 'Email', attending: 'Attending', meal: 'Meal', dietary: 'Dietary', status: 'Status',
}

/** Flat one-row-per-guest table across all parties. */
export function GuestTable({
  rows, memberByGuestId, onOpenGuest,
}: {
  rows: FlatRow[]
  memberByGuestId: Map<number, WeddingPartyMember>
  onOpenGuest: (partyId: number, guestId: number) => void
}) {
  const columns = useMemo(() => [
    columnHelper.accessor((row) => `${row.guest.first_name} ${row.guest.last_name}`.trim(), {
      id: 'name',
      header: 'Name',
      cell: (info) => {
        const { guest } = info.row.original
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-stone-800">
              {guest.first_name} {guest.last_name}
            </span>
            <GuestFlags guest={guest} member={memberByGuestId.get(guest.id)} />
          </div>
        )
      },
    }),
    columnHelper.accessor((row) => row.guest.label ?? '', {
      id: 'label',
      header: 'Label',
      cell: (info) => {
        const lbl = info.getValue()
        return lbl ? <Badge>{lbl}</Badge> : <span className="text-stone-300 text-[10px]">—</span>
      },
    }),
    columnHelper.accessor((row) => row.party.name, {
      id: 'party',
      header: 'Party',
      cell: (info) => <span className="text-stone-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.party.category ?? '', {
      id: 'category',
      header: 'Category',
      cell: (info) => info.getValue() || <span className="text-stone-300">—</span>,
    }),
    columnHelper.accessor((row) => row.guest.email ?? '', {
      id: 'email',
      header: 'Email',
      cell: (info) => <span className="text-stone-500">{info.getValue() || <span className="text-stone-300">—</span>}</span>,
    }),
    columnHelper.accessor((row) => row.guest.is_attending, {
      id: 'attending',
      header: 'Attending',
      sortingFn: (a, b) => {
        const order = (v: boolean | null) => v === true ? 0 : v === false ? 2 : 1
        return order(a.original.guest.is_attending) - order(b.original.guest.is_attending)
      },
      cell: (info) => <AttendingBadge value={info.getValue()} />,
    }),
    columnHelper.accessor((row) => row.guest.meal ?? '', {
      id: 'meal',
      header: 'Meal',
      cell: (info) => <span className="text-stone-500 text-[11px]">{MEAL_LABELS[info.getValue()] || '—'}</span>,
    }),
    columnHelper.accessor((row) => row.guest.dietary_restrictions ?? '', {
      id: 'dietary',
      header: 'Dietary',
      cell: (info) => <span className="text-stone-500">{info.getValue() || <span className="text-stone-300">—</span>}</span>,
    }),
    columnHelper.accessor((row) => row.party.status, {
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const s = info.getValue() as InviteStatus
        return (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${INVITE_STATUS_COLORS[s]}`}>
            {INVITE_STATUS_LABELS[s]}
          </span>
        )
      },
    }),
  ], [memberByGuestId])

  return (
    <DataTable
      data={rows}
      columns={columns}
      columnLabels={COLUMN_LABELS}
      defaultVisibility={DEFAULT_COLUMNS}
      onRowClick={(row) => onOpenGuest(row.party.id, row.guest.id)}
      emptyMessage="No contacts match."
    />
  )
}
