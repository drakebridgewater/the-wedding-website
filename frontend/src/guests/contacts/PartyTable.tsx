import { useMemo } from 'react'
import { toast } from 'sonner'
import { createColumnHelper, type VisibilityState } from '@tanstack/react-table'
import { DataTable } from '../components/DataTable'
import { Badge } from '../components/badges'
import { StatusSelect } from '../components/StatusSelect'
import { TogglePill } from '../components/TogglePill'
import type { useUpdateParty } from '../api'
import type { Party, PartyFormData } from '../types'
import { PARTY_TYPE_LABELS, PARTY_SIDE_LABELS } from '../types'

const columnHelper = createColumnHelper<Party>()

const DEFAULT_COLUMNS: VisibilityState = {
  name: true, guests: true, status: true,
  rehearsal_dinner: true, wants_physical_card: true, plus_one_allowed: true,
  side: true, type: false,
}

const COLUMN_LABELS: Record<string, string> = {
  name: 'Party', guests: 'Guests', status: 'Status',
  rehearsal_dinner: 'RD', wants_physical_card: '✉',
  plus_one_allowed: '+1', side: 'Side', type: 'Type',
}

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
            : <span className="text-stone-300 text-[10px]">—</span>
        },
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue()
          return type
            ? <Badge>{PARTY_TYPE_LABELS[type]}</Badge>
            : <span className="text-stone-300 text-[10px]">—</span>
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
