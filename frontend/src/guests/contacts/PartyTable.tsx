import { useMemo } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { createColumnHelper, type VisibilityState } from '@tanstack/react-table'
import { DataTable } from '../components/DataTable'
import { Badge } from '../components/badges'
import { CopyLinkMenu } from '../components/CopyLinkMenu'
import { StatusSelect } from '../components/StatusSelect'
import { TogglePill } from '../components/TogglePill'
import type { useUpdateParty } from '../api'
import type { Party, PartyFormData } from '../types'
import { PARTY_TYPE_LABELS, PARTY_SIDE_LABELS } from '../types'

const columnHelper = createColumnHelper<Party>()

const DEFAULT_COLUMNS: VisibilityState = {
  name: true, guests: true, status: true,
  std_sent: true, std_opened: true, inv_sent: false, inv_opened: false,
  address: true, address_verified: true,
  rehearsal_dinner: true, wants_physical_card: true, plus_one_allowed: false,
  side: false, type: false, links: true,
}

const COLUMN_LABELS: Record<string, string> = {
  name: 'Party', guests: 'Guests', status: 'Status',
  std_sent: 'STD sent', std_opened: 'STD opened',
  inv_sent: 'Invite sent', inv_opened: 'Invite opened',
  address: 'Address', address_verified: 'Address ✓',
  rehearsal_dinner: 'RD', wants_physical_card: '✉',
  plus_one_allowed: '+1', side: 'Side', type: 'Type',
  links: 'Copy link',
}

const Dash = () => <span className="text-stone-300 text-[10px]">—</span>

/** A tracked timestamp, or a dash explaining why there isn't one. */
function DateCell({ value, emptyTitle, tone = 'stone' }: {
  value: string | null
  emptyTitle: string
  tone?: 'stone' | 'emerald'
}) {
  if (!value) return <span title={emptyTitle}><Dash /></span>
  const date = new Date(value)
  return (
    <span
      title={format(date, "EEEE d MMMM yyyy 'at' h:mm a")}
      className={tone === 'emerald' ? 'text-emerald-600' : 'text-stone-500'}
    >
      {format(date, 'MMM d')}
    </span>
  )
}

/**
 * Sort key for a nullable timestamp column. Empty string keeps un-sent /
 * un-opened parties grouped together at one end rather than scattered.
 */
const dateKey = (value: string | null) => value ?? ''

/** One-row-per-party table with inline flag toggles. */
export function PartyTable({
  parties, updateParty, onOpenGuest,
}: {
  parties: Party[]
  updateParty: ReturnType<typeof useUpdateParty>
  onOpenGuest: (partyId: number, guestId?: number) => void
}) {
  const columns = useMemo(() => {
    function patch(party: Party, data: Partial<PartyFormData>) {
      updateParty.mutateAsync({ id: party.id, data }).catch(() => toast.error('Failed to update'))
    }

    return [
      columnHelper.accessor('name', {
        header: 'Party',
        cell: (info) => <span className="font-medium text-stone-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.guests.length, {
        id: 'guests',
        header: 'Guests',
        cell: (info) => {
          const { guests } = info.row.original
          const attending = guests.filter((g) => g.is_attending).length
          return (
            <span className="text-stone-500">
              {guests.length}
              {attending > 0 && <span className="text-emerald-600 ml-1">· {attending} ✓</span>}
            </span>
          )
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const party = info.row.original
          return <StatusSelect value={party.status} onChange={(s) => patch(party, { status: s })} />
        },
      }),
      columnHelper.accessor((row) => dateKey(row.save_the_date_sent), {
        id: 'std_sent',
        header: 'STD sent',
        cell: (info) => (
          <DateCell value={info.row.original.save_the_date_sent} emptyTitle="Save the Date not sent yet" />
        ),
      }),
      columnHelper.accessor((row) => dateKey(row.save_the_date_opened), {
        id: 'std_opened',
        header: 'STD opened',
        cell: (info) => (
          <DateCell
            value={info.row.original.save_the_date_opened}
            tone="emerald"
            emptyTitle={info.row.original.save_the_date_sent
              ? 'Sent, but nobody has opened the link yet'
              : 'Save the Date not sent yet'}
          />
        ),
      }),
      columnHelper.accessor((row) => dateKey(row.invitation_sent), {
        id: 'inv_sent',
        header: 'Invite sent',
        cell: (info) => (
          <DateCell value={info.row.original.invitation_sent} emptyTitle="Invitation not sent yet" />
        ),
      }),
      columnHelper.accessor((row) => dateKey(row.invitation_opened), {
        id: 'inv_opened',
        header: 'Invite opened',
        cell: (info) => (
          <DateCell
            value={info.row.original.invitation_opened}
            tone="emerald"
            emptyTitle={info.row.original.invitation_sent
              ? 'Sent, but nobody has opened the link yet'
              : 'Invitation not sent yet'}
          />
        ),
      }),
      columnHelper.accessor('address', {
        header: 'Address',
        cell: (info) => {
          const address = (info.getValue() ?? '').trim()
          return address
            ? <span className="text-stone-500" title={address}>{address}</span>
            : <Dash />
        },
      }),
      columnHelper.accessor('address_verified', {
        header: 'Address ✓',
        cell: (info) => {
          const party = info.row.original
          if (!(party.address ?? '').trim()) {
            return <span title="No address on file"><Dash /></span>
          }
          return party.address_verified
            ? <Badge tone="emerald" title="Picked from a Google Places suggestion">✓ verified</Badge>
            : <Badge tone="amber" title="Typed by hand — not confirmed against Google Places">unverified</Badge>
        },
      }),
      columnHelper.accessor('rehearsal_dinner', {
        header: 'RD',
        cell: (info) => {
          const party = info.row.original
          return (
            <TogglePill
              label="RD" tone="emerald" active={party.rehearsal_dinner}
              titleOn="Remove from rehearsal dinner" titleOff="Add to rehearsal dinner"
              onToggle={() => patch(party, { rehearsal_dinner: !party.rehearsal_dinner })}
            />
          )
        },
      }),
      columnHelper.accessor('wants_physical_card', {
        header: '✉',
        cell: (info) => {
          const party = info.row.original
          return (
            <TogglePill
              label="✉" tone="sky" active={party.wants_physical_card}
              titleOn="Remove physical card" titleOff="Add physical card"
              onToggle={() => patch(party, { wants_physical_card: !party.wants_physical_card })}
            />
          )
        },
      }),
      columnHelper.accessor('plus_one_allowed', {
        header: '+1',
        cell: (info) => {
          const party = info.row.original
          return (
            <TogglePill
              label="+1" tone="amber" active={party.plus_one_allowed}
              titleOn="Remove +1 allowance" titleOff="Allow +1"
              onToggle={() => patch(party, { plus_one_allowed: !party.plus_one_allowed })}
            />
          )
        },
      }),
      columnHelper.accessor('side', {
        header: 'Side',
        cell: (info) => {
          const side = info.getValue()
          return side
            ? <Badge tone="violet">{PARTY_SIDE_LABELS[side]}</Badge>
            : <Dash />
        },
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue()
          return type
            ? <Badge>{PARTY_TYPE_LABELS[type]}</Badge>
            : <Dash />
        },
      }),
      columnHelper.display({
        id: 'links',
        header: 'Copy link',
        enableSorting: false,
        cell: (info) => {
          const party = info.row.original
          return <CopyLinkMenu links={party.links} partyName={party.name} />
        },
      }),
    ]
  }, [updateParty])

  return (
    <DataTable
      data={parties}
      columns={columns}
      columnLabels={COLUMN_LABELS}
      defaultVisibility={DEFAULT_COLUMNS}
      onRowClick={(party) => onOpenGuest(party.id)}
      emptyMessage="No parties match."
    />
  )
}
