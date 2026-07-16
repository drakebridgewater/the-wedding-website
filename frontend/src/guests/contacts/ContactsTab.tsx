import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, LayoutList, Plus, Search, Table2, TableProperties, Upload } from 'lucide-react'
import {
  useCreateParty, useDeleteParty, useMembers, useParties, useUpdateParty,
} from '../api'
import { EMPTY_PARTY_FORM } from '../types'
import { FilterMenu, type FilterSection } from '../components/FilterMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import {
  buildPartyFilterSections, countActiveFilters, partyMatchesFilters, type PartyFilterState,
} from '../partyFilters'
import { guestMatchesFilter, guestMatchesSearch, type FilterMode } from './filters'
import { PartyCard } from './PartyCard'
import { GuestTable } from './GuestTable'
import { PartyTable } from './PartyTable'
import { UnassignedGuests } from './UnassignedGuests'
import { ImportCsvModal } from './ImportCsvModal'
import { AddPartyModal } from './AddPartyModal'

type ViewMode = 'cards' | 'parties' | 'guests'

const VIEW_MODES: { id: ViewMode; icon: typeof LayoutList; title: string }[] = [
  { id: 'cards',   icon: LayoutList,      title: 'Party cards' },
  { id: 'parties', icon: TableProperties, title: 'Party table' },
  { id: 'guests',  icon: Table2,          title: 'Guest table' },
]

export function ContactsTab({
  onOpenGuest,
}: {
  onOpenGuest: (partyId: number, guestId?: number) => void
}) {
  const { data: parties = [], isLoading } = useParties()
  const { data: members = [] } = useMembers()
  const createParty = useCreateParty()
  const updateParty = useUpdateParty()
  const deleteParty = useDeleteParty()

  const [showAddPartyModal, setShowAddPartyModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pendingDeletePartyId, setPendingDeletePartyId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [partyFilter, setPartyFilter] = useState<PartyFilterState>({})
  const [searchQuery, setSearchQuery] = useState('')

  // ── Derived maps ─────────────────────────────────────────────────────────────

  const memberByGuestId = useMemo(
    () => new Map(members.filter((m) => m.guest_id != null).map((m) => [m.guest_id!, m])),
    [members],
  )

  const { allLabels, labelCounts } = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of parties) {
      for (const g of p.guests) {
        if (g.label) counts[g.label] = (counts[g.label] ?? 0) + 1
      }
    }
    return { allLabels: Object.keys(counts).sort(), labelCounts: counts }
  }, [parties])

  const totalGuests = parties.reduce((n, p) => n + p.guests.length, 0)
  const noLabelCount = parties.reduce((n, p) => n + p.guests.filter((g) => !g.label).length, 0)
  const attending = parties.reduce((n, p) => n + p.guests.filter((g) => g.is_attending).length, 0)

  // ── Filtered parties/rows ─────────────────────────────────────────────────────

  // The party-level filters narrow the pool first; the label filter and search
  // then run within it.
  const partyScoped = useMemo(
    () => parties.filter((p) => partyMatchesFilters(p, partyFilter)),
    [parties, partyFilter],
  )

  const filteredParties = useMemo(() => {
    if (filterMode === 'all' && !searchQuery) return partyScoped
    return partyScoped.filter((p) => {
      if (filterMode === 'all' && searchQuery && p.name.toLowerCase().includes(searchQuery.toLowerCase())) return true
      return p.guests.some(
        (g) => guestMatchesFilter(g, filterMode) && guestMatchesSearch(g, p, searchQuery),
      )
    })
  }, [partyScoped, filterMode, searchQuery])

  const filteredFlatRows = useMemo(
    () =>
      partyScoped.flatMap((p) =>
        p.guests
          .filter((g) => guestMatchesFilter(g, filterMode) && guestMatchesSearch(g, p, searchQuery))
          .map((g) => ({ guest: g, party: p })),
      ),
    [partyScoped, filterMode, searchQuery],
  )

  // ── Filter menu ───────────────────────────────────────────────────────────────

  const labelSection: FilterSection = {
    id: 'label',
    label: 'Label',
    value: filterMode === 'all' ? null : filterMode,
    options: [
      ...allLabels.map((lbl) => ({ id: `label:${lbl}`, label: lbl, count: labelCounts[lbl] })),
      { id: 'no_label', label: 'No label', count: noLabelCount },
    ],
    onChange: (id) => setFilterMode((id as FilterMode | null) ?? 'all'),
  }

  const filterSections = [
    ...buildPartyFilterSections(parties, partyFilter, setPartyFilter),
    labelSection,
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSaveParty(name: string) {
    try {
      const party = await createParty.mutateAsync({ name, ...EMPTY_PARTY_FORM })
      setShowAddPartyModal(false)
      onOpenGuest(party.id)
    } catch {
      toast.error('Failed to save')
    }
  }

  async function handleDeleteParty(id: number) {
    try {
      await deleteParty.mutateAsync(id)
      toast.success('Party deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (isLoading) return <div className="text-sm text-stone-400">Loading…</div>

  const isFiltered = filterMode !== 'all' || countActiveFilters(partyFilter) > 0 || !!searchQuery

  function clearFilters() {
    setFilterMode('all')
    setPartyFilter({})
    setSearchQuery('')
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search contacts…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400"
        />
      </div>

      {parties.length > 0 && (
        <FilterMenu sections={filterSections} className="mb-4 pb-3 border-b border-stone-100" />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <p className="text-sm text-stone-500">
          {isFiltered
            ? <>{filteredParties.length} of {parties.length} parties · {filteredFlatRows.length} of {totalGuests} contacts</>
            : <>{parties.length} parties · {totalGuests} contacts{attending > 0 && <span className="ml-2 text-emerald-600">{attending} attending</span>}</>
          }
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border border-stone-200 overflow-hidden">
            {VIEW_MODES.map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                title={title}
                className={`p-2.5 transition-colors ${viewMode === id ? 'bg-stone-800 text-white' : 'bg-white text-stone-400 hover:text-stone-600'}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          <a href="/guests/export"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
            title="Download all guests as CSV">
            <Download size={14} /><span className="hidden sm:inline">Export CSV</span>
          </a>
          <button
            onClick={() => setShowImportModal(true)}
            title="Import guests from CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition-colors">
            <Upload size={14} /><span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            onClick={() => setShowAddPartyModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-700 transition-colors">
            <Plus size={14} /> Add Party
          </button>
        </div>
      </div>

      {parties.length === 0 ? (
        <EmptyState
          message="No contacts yet."
          actionLabel="Add the first one →"
          onAction={() => setShowAddPartyModal(true)}
        />
      ) : isFiltered && filteredParties.length === 0 ? (
        <EmptyState
          message="No contacts match this filter."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : viewMode === 'guests' ? (
        <GuestTable
          rows={filteredFlatRows}
          memberByGuestId={memberByGuestId}
          onOpenGuest={onOpenGuest}
        />
      ) : viewMode === 'parties' ? (
        <PartyTable
          parties={filteredParties}
          updateParty={updateParty}
          onOpenGuest={onOpenGuest}
        />
      ) : (
        <div className="space-y-2">
          {filteredParties.map((party) => (
            <PartyCard
              key={party.id}
              party={party}
              expanded={expanded.has(party.id)}
              onToggle={() => toggleExpand(party.id)}
              onEdit={() => onOpenGuest(party.id, party.guests[0]?.id)}
              onDelete={() => setPendingDeletePartyId(party.id)}
              memberByGuestId={memberByGuestId}
              filterMode={filterMode}
              searchQuery={searchQuery}
              onOpenGuest={onOpenGuest}
              updateParty={updateParty}
            />
          ))}
        </div>
      )}

      {showAddPartyModal && (
        <AddPartyModal
          onSave={handleSaveParty}
          onClose={() => setShowAddPartyModal(false)}
          saving={createParty.isPending}
        />
      )}
      {showImportModal && <ImportCsvModal onClose={() => setShowImportModal(false)} />}
      {pendingDeletePartyId !== null && (
        <ConfirmDialog
          title="Delete party"
          message="Delete this party and all their guests? This cannot be undone."
          confirmLabel="Delete party"
          onConfirm={() => handleDeleteParty(pendingDeletePartyId)}
          onClose={() => setPendingDeletePartyId(null)}
        />
      )}
      <UnassignedGuests parties={parties} onOpenGuest={onOpenGuest} />
    </div>
  )
}
