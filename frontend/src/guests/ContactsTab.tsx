import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown, ChevronRight, Pencil, Trash2, Plus, UserPlus,
  Upload, X, LayoutList, Table2, TableProperties, Download, Search, Settings2,
  ArrowUp, ArrowDown, ChevronsUpDown,
} from 'lucide-react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper,
  type SortingState, type VisibilityState,
} from '@tanstack/react-table'
import {
  useParties, useCreateParty, useUpdateParty, useDeleteParty,
  useAddGuest, useUpdateGuest, useDeleteGuest, useUnassignedGuests,
  useMembers,
} from './api'
import type {
  Guest, Party, PartyFormData, InviteStatus, WeddingPartyMember,
} from './types'
import {
  MEAL_LABELS, PARTY_TYPE_LABELS, PARTY_TYPE_DESCRIPTIONS, PARTY_SIDE_LABELS,
  INVITE_STATUS_LABELS, INVITE_STATUS_COLORS,
} from './types'

type FilterMode = 'all' | `label:${string}` | 'no_label' | 'rehearsal_dinner' | 'no_rehearsal_dinner'

// ── Filter helpers ─────────────────────────────────────────────────────────────

function guestMatchesFilter(
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

function guestMatchesSearch(guest: Guest, party: Party, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(q) ||
    (guest.email?.toLowerCase() ?? '').includes(q) ||
    (guest.label?.toLowerCase() ?? '').includes(q) ||
    party.name.toLowerCase().includes(q)
  )
}

// ── Enter-to-submit hook ───────────────────────────────────────────────────────

function useEnterSubmit(onSubmit: () => void, disabled?: boolean) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'Enter' || disabled) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return
      e.preventDefault()
      onSubmit()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSubmit, disabled])
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title, message, confirmLabel = 'Delete', onConfirm, onClose,
}: {
  title: string; message: string; confirmLabel?: string
  onConfirm: () => void; onClose: () => void
}) {
  useEnterSubmit(() => { onConfirm(); onClose() })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-stone-600">{message}</p>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose() }}
            className="px-4 py-2 text-sm text-white bg-rose-600 rounded-lg hover:bg-rose-700">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CSV Import Modal ───────────────────────────────────────────────────────────

interface ImportStats {
  parties_created: number; parties_updated: number
  guests_created: number; guests_updated: number; skipped: number
}

function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()
  useEnterSubmit(() => { if (result) { onClose() } else { handleImport() } }, loading || (!file && !result))

  async function handleImport() {
    if (!file) return
    setLoading(true); setError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/guests/api/import-csv/', {
        method: 'POST',
        headers: { 'X-CSRFToken': (document.cookie.match(/csrftoken=([^;]+)/) ?? [])[1] ?? '' },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult(data as ImportStats)
      qc.invalidateQueries({ queryKey: ['guests', 'parties'] })
      qc.invalidateQueries({ queryKey: ['guests', 'unassigned'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">Import Guests from CSV</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
        </div>
        {result ? (
          <div className="px-5 py-5 space-y-3">
            <p className="text-sm font-medium text-emerald-700">Import complete!</p>
            <ul className="text-sm text-stone-600 space-y-1">
              {(result.parties_created > 0 || result.parties_updated > 0) && (
                <li>{result.parties_created} parties created, {result.parties_updated} updated</li>
              )}
              <li>{result.guests_created} guests created, {result.guests_updated} updated</li>
              {result.skipped > 0 && <li className="text-amber-600">{result.skipped} rows skipped</li>}
            </ul>
            <button onClick={onClose}
              className="w-full mt-2 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700">
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <div className="space-y-2">
              <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-500 space-y-1">
                <p className="font-medium text-stone-700">Google Contacts export</p>
                <p>Export from <span className="font-mono">contacts.google.com</span> → More actions → Export → Google CSV.</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-500 space-y-1">
                <p className="font-medium text-stone-700">Native format</p>
                <p className="font-mono">first_name, last_name, is_child, category, is_invited, email</p>
              </div>
              <p className="text-xs text-stone-400">Format is detected automatically from the header row.</p>
            </div>
            <div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-stone-300 rounded-lg py-6 text-sm text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors">
                {file ? <span className="text-stone-700 font-medium">{file.name}</span>
                      : <span>Click to choose a .csv file</span>}
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={onClose}
                className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">
                Cancel
              </button>
              <button onClick={handleImport} disabled={!file || loading}
                className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50">
                {loading ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline Edit Cell ───────────────────────────────────────────────────────────

function InlineEditCell({ value, onSave, type = 'text' }: {
  value: string; onSave: (v: string) => Promise<unknown>; type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  async function commit() {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft); setEditing(false) }
    catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (editing) {
    return (
      <input ref={ref} type={type} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        disabled={saving}
        className="border-b border-stone-400 bg-transparent focus:outline-none min-w-0"
      />
    )
  }
  return (
    <span onClick={() => setEditing(true)}
      className={`cursor-text rounded hover:bg-stone-100 px-0.5 ${saving ? 'opacity-50' : ''}`}>
      {value || <span className="text-stone-300">—</span>}
    </span>
  )
}

// ── Label Badge ────────────────────────────────────────────────────────────────

function LabelBadge({
  guest, onOpenGuest, partyId,
}: {
  guest: Guest
  onOpenGuest: (partyId: number, guestId: number) => void
  partyId: number
}) {
  if (!guest.label) return null
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpenGuest(partyId, guest.id) }}
      className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium hover:bg-stone-200 transition-colors cursor-pointer"
      title="Click to edit"
    >
      {guest.label}
    </button>
  )
}

// ── Filter Chip ────────────────────────────────────────────────────────────────

function FilterChip({
  label, count, active, onClick, outline = false,
}: {
  label: string; count?: number; active: boolean; onClick: () => void; outline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-stone-800 text-white'
          : outline
            ? 'border border-stone-300 text-stone-600 hover:border-stone-400 hover:text-stone-800'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  )
}

// ── Contacts Tab ───────────────────────────────────────────────────────────────

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
  const [viewMode, setViewMode] = useState<'cards' | 'parties' | 'guests'>('cards')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Derived maps ─────────────────────────────────────────────────────────────

  const memberByGuestId = useMemo(
    () => new Map(members.filter((m) => m.guest_id != null).map((m) => [m.guest_id!, m])),
    [members],
  )

  const rehearsalGuestIds = useMemo(() => {
    const ids = new Set<number>()
    for (const p of parties) {
      if (p.rehearsal_dinner) for (const g of p.guests) ids.add(g.id)
    }
    return ids
  }, [parties])

  // Derive unique labels from all guests
  const allLabels = useMemo(() => {
    const labels = new Set<string>()
    for (const p of parties) {
      for (const g of p.guests) {
        if (g.label) labels.add(g.label)
      }
    }
    return Array.from(labels).sort()
  }, [parties])

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of parties) {
      for (const g of p.guests) {
        if (g.label) counts[g.label] = (counts[g.label] ?? 0) + 1
      }
    }
    return counts
  }, [parties])

  const totalGuests = parties.reduce((n, p) => n + p.guests.length, 0)
  const noLabelCount = parties.reduce((n, p) => n + p.guests.filter((g) => !g.label).length, 0)

  // ── Filtered parties/rows ─────────────────────────────────────────────────────

  const filteredParties = useMemo(() => {
    if (filterMode === 'all' && !searchQuery) return parties
    return parties.filter((p) => {
      if (filterMode === 'all' && searchQuery && p.name.toLowerCase().includes(searchQuery.toLowerCase())) return true
      return p.guests.some(
        (g) =>
          guestMatchesFilter(g, filterMode, rehearsalGuestIds) &&
          guestMatchesSearch(g, p, searchQuery),
      )
    })
  }, [parties, filterMode, rehearsalGuestIds, searchQuery])

  const filteredFlatRows = useMemo(
    () =>
      parties.flatMap((p) =>
        p.guests
          .filter(
            (g) =>
              guestMatchesFilter(g, filterMode, rehearsalGuestIds) &&
              guestMatchesSearch(g, p, searchQuery),
          )
          .map((g) => ({ guest: g, party: p })),
      ),
    [parties, filterMode, rehearsalGuestIds, searchQuery],
  )

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
      const party = await createParty.mutateAsync({
        name, type: '', category: '', status: 'planned',
        rehearsal_dinner: false, comments: '', address: '',
        wants_physical_card: false, side: '', plus_one_allowed: false,
      })
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

  const attending = parties.reduce((n, p) => n + p.guests.filter((g) => g.is_attending).length, 0)

  if (isLoading) return <div className="text-sm text-stone-400">Loading…</div>

  const isFiltered = filterMode !== 'all' || !!searchQuery

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
          className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap items-center mb-4 pb-3 border-b border-stone-100">
        <FilterChip label="All" count={totalGuests} active={filterMode === 'all'} onClick={() => setFilterMode('all')} />
        {parties.length > 0 && (
          <>
            <FilterChip
              label="RD Invited"
              count={rehearsalGuestIds.size}
              active={filterMode === 'rehearsal_dinner'}
              onClick={() => setFilterMode('rehearsal_dinner')}
            />
            <FilterChip
              label="RD Not Invited"
              count={totalGuests - rehearsalGuestIds.size}
              active={filterMode === 'no_rehearsal_dinner'}
              onClick={() => setFilterMode('no_rehearsal_dinner')}
            />
          </>
        )}
        {allLabels.map((lbl) => (
          <FilterChip
            key={lbl}
            label={lbl}
            count={labelCounts[lbl]}
            active={filterMode === `label:${lbl}`}
            onClick={() => setFilterMode(`label:${lbl}` as FilterMode)}
          />
        ))}
        {noLabelCount > 0 && (
          <FilterChip
            label="No label"
            count={noLabelCount}
            active={filterMode === 'no_label'}
            onClick={() => setFilterMode('no_label')}
          />
        )}
      </div>

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
            <button
              onClick={() => setViewMode('cards')}
              title="Party cards"
              className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-stone-800 text-white' : 'bg-white text-stone-400 hover:text-stone-600'}`}
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => setViewMode('parties')}
              title="Party table"
              className={`p-2 transition-colors ${viewMode === 'parties' ? 'bg-stone-800 text-white' : 'bg-white text-stone-400 hover:text-stone-600'}`}
            >
              <TableProperties size={14} />
            </button>
            <button
              onClick={() => setViewMode('guests')}
              title="Guest table"
              className={`p-2 transition-colors ${viewMode === 'guests' ? 'bg-stone-800 text-white' : 'bg-white text-stone-400 hover:text-stone-600'}`}
            >
              <Table2 size={14} />
            </button>
          </div>
          <a href="/guests/export"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
            title="Download all guests as CSV">
            <Download size={14} /><span className="hidden sm:inline">Export CSV</span>
          </a>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition-colors">
            <Upload size={14} /><span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            onClick={() => setShowAddPartyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-700 transition-colors">
            <Plus size={14} /> Add Party
          </button>
        </div>
      </div>

      {parties.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No contacts yet.</p>
          <button onClick={() => setShowAddPartyModal(true)} className="mt-3 text-sm text-rose-600 hover:underline">Add the first one →</button>
        </div>
      ) : isFiltered && filteredParties.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No contacts match this filter.</p>
          <button onClick={() => { setFilterMode('all'); setSearchQuery('') }} className="mt-3 text-sm text-stone-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : viewMode === 'guests' ? (
        <FlatGuestTable
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
            <PartyRow
              key={party.id}
              party={party}
              expanded={expanded.has(party.id)}
              onToggle={() => toggleExpand(party.id)}
              onEdit={() => onOpenGuest(party.id, party.guests[0]?.id)}
              onDelete={() => setPendingDeletePartyId(party.id)}
              memberByGuestId={memberByGuestId}
              filterMode={filterMode}
              rehearsalGuestIds={rehearsalGuestIds}
              searchQuery={searchQuery}
              onOpenGuest={onOpenGuest}
              updateParty={updateParty}
            />
          ))}
        </div>
      )}

      {showAddPartyModal && (
        <PartyModal
          onSave={handleSaveParty}
          onClose={() => setShowAddPartyModal(false)}
          saving={createParty.isPending}
        />
      )}
      {showImportModal && <ImportCsvModal onClose={() => setShowImportModal(false)} />}
      {pendingDeletePartyId !== null && (
        <ConfirmModal
          title="Delete party"
          message="Delete this party and all their guests? This cannot be undone."
          confirmLabel="Delete party"
          onConfirm={() => handleDeleteParty(pendingDeletePartyId)}
          onClose={() => setPendingDeletePartyId(null)}
        />
      )}
      <UnassignedGuestsSection parties={parties} onOpenGuest={onOpenGuest} />
    </div>
  )
}

// ── Flat Guest Table (TanStack Table) ──────────────────────────────────────────

type FlatRow = { guest: Guest; party: Party }
const columnHelper = createColumnHelper<FlatRow>()
const partyColumnHelper = createColumnHelper<Party>()

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

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp size={11} className="text-stone-600" />
  if (sorted === 'desc') return <ArrowDown size={11} className="text-stone-600" />
  return <ChevronsUpDown size={11} className="text-stone-300" />
}

function FlatGuestTable({
  rows, memberByGuestId, onOpenGuest,
}: {
  rows: FlatRow[]
  memberByGuestId: Map<number, WeddingPartyMember>
  onOpenGuest: (partyId: number, guestId: number) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_COLUMNS)
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showColPicker) return
    function handler(e: MouseEvent) {
      if (!colPickerRef.current?.contains(e.target as Node)) setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColPicker])

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
            {guest.is_plus_one && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">+1</span>
            )}
            {guest.is_child && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>
            )}
            {memberByGuestId.has(guest.id) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 font-medium">
                {memberByGuestId.get(guest.id)!.role.replace('_', ' ')}
              </span>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor((row) => row.guest.label ?? '', {
      id: 'label',
      header: 'Label',
      cell: (info) => {
        const lbl = info.getValue()
        return lbl
          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">{lbl}</span>
          : <span className="text-stone-300 text-[10px]">—</span>
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
      cell: (info) => {
        const v = info.getValue()
        return (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            v === true  ? 'bg-emerald-100 text-emerald-700' :
            v === false ? 'bg-rose-100 text-rose-600' :
                          'bg-stone-100 text-stone-400'
          }`}>
            {v === true ? 'Yes' : v === false ? 'No' : 'Pending'}
          </span>
        )
      },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [memberByGuestId])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const COLUMN_LABELS: Record<string, string> = {
    name: 'Name', label: 'Label', party: 'Party', category: 'Category',
    email: 'Email', attending: 'Attending', meal: 'Meal', dietary: 'Dietary', status: 'Status',
  }

  if (rows.length === 0) return (
    <div className="text-center py-16 text-stone-400 text-sm">No contacts match.</div>
  )

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Column visibility toggle */}
      <div className="flex justify-end px-3 py-2 border-b border-stone-100">
        <div className="relative" ref={colPickerRef}>
          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Settings2 size={12} /> Columns
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-stone-200 rounded-lg shadow-lg p-2 min-w-[140px]">
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1 hover:bg-stone-50 rounded cursor-pointer text-xs text-stone-700">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    className="w-3 h-3 rounded"
                  />
                  {COLUMN_LABELS[col.id] ?? col.id}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-stone-50 border-b border-stone-200">
                {hg.headers.map((header) => (
                  <th key={header.id} className="text-left px-3 py-3 text-stone-500 font-medium">
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-stone-800 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon sorted={header.column.getIsSorted()} />
                      </button>
                    )}
                  </th>
                ))}
                <th className="px-3 py-3 w-10" />
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-stone-50">
            {table.getRowModel().rows.map((row) => {
              const { guest, party } = row.original
              return (
                <tr
                  key={row.id}
                  onClick={() => onOpenGuest(party.id, guest.id)}
                  className="hover:bg-stone-50/60 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 max-w-[200px] truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <Pencil size={11} className="text-stone-300 hover:text-stone-600 transition-colors" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Party Table ───────────────────────────────────────────────────────────────

const DEFAULT_PARTY_COLUMNS: VisibilityState = {
  name: true, guests: true, status: true,
  rehearsal_dinner: true, wants_physical_card: true, plus_one_allowed: true,
  side: true, type: false,
}

const PARTY_COLUMN_LABELS: Record<string, string> = {
  name: 'Party', guests: 'Guests', status: 'Status',
  rehearsal_dinner: 'RD', wants_physical_card: '✉',
  plus_one_allowed: '+1', side: 'Side', type: 'Type',
}

function PartyTable({
  parties, updateParty, onOpenGuest,
}: {
  parties: Party[]
  updateParty: ReturnType<typeof useUpdateParty>
  onOpenGuest: (partyId: number, guestId?: number) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_PARTY_COLUMNS)
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showColPicker) return
    function handler(e: MouseEvent) {
      if (!colPickerRef.current?.contains(e.target as Node)) setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColPicker])

  function patch(party: Party, data: Partial<PartyFormData>) {
    updateParty.mutateAsync({ id: party.id, data }).catch(() => toast.error('Failed to update'))
  }

  const columns = useMemo(() => [
    partyColumnHelper.accessor('name', {
      header: 'Party',
      cell: (info) => (
        <span className="font-medium text-stone-800">{info.getValue()}</span>
      ),
    }),
    partyColumnHelper.accessor((row) => row.guests.length, {
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
    partyColumnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const party = info.row.original
        return (
          <select
            value={party.status}
            onChange={(e) => patch(party, { status: e.target.value as InviteStatus })}
            onClick={(e) => e.stopPropagation()}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-stone-400 ${INVITE_STATUS_COLORS[party.status]}`}
          >
            {(Object.entries(INVITE_STATUS_LABELS) as [InviteStatus, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        )
      },
    }),
    partyColumnHelper.accessor('rehearsal_dinner', {
      header: 'RD',
      cell: (info) => {
        const party = info.row.original
        return (
          <button
            onClick={(e) => { e.stopPropagation(); patch(party, { rehearsal_dinner: !party.rehearsal_dinner }) }}
            title={party.rehearsal_dinner ? 'Remove from rehearsal dinner' : 'Add to rehearsal dinner'}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              party.rehearsal_dinner
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'border border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-600'
            }`}
          >
            RD
          </button>
        )
      },
    }),
    partyColumnHelper.accessor('wants_physical_card', {
      header: '✉',
      cell: (info) => {
        const party = info.row.original
        return (
          <button
            onClick={(e) => { e.stopPropagation(); patch(party, { wants_physical_card: !party.wants_physical_card }) }}
            title={party.wants_physical_card ? 'Remove physical card' : 'Add physical card'}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              party.wants_physical_card
                ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                : 'border border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-600'
            }`}
          >
            ✉
          </button>
        )
      },
    }),
    partyColumnHelper.accessor('plus_one_allowed', {
      header: '+1',
      cell: (info) => {
        const party = info.row.original
        return (
          <button
            onClick={(e) => { e.stopPropagation(); patch(party, { plus_one_allowed: !party.plus_one_allowed }) }}
            title={party.plus_one_allowed ? 'Remove +1 allowance' : 'Allow +1'}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              party.plus_one_allowed
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'border border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-600'
            }`}
          >
            +1
          </button>
        )
      },
    }),
    partyColumnHelper.accessor('side', {
      header: 'Side',
      cell: (info) => {
        const side = info.getValue()
        return side
          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">{PARTY_SIDE_LABELS[side]}</span>
          : <span className="text-stone-300 text-[10px]">—</span>
      },
    }),
    partyColumnHelper.accessor('type', {
      header: 'Type',
      cell: (info) => {
        const type = info.getValue()
        return type
          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">{PARTY_TYPE_LABELS[type]}</span>
          : <span className="text-stone-300 text-[10px]">—</span>
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [updateParty])

  const table = useReactTable({
    data: parties,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (parties.length === 0) return (
    <div className="text-center py-16 text-stone-400 text-sm">No parties match.</div>
  )

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="flex justify-end px-3 py-2 border-b border-stone-100">
        <div className="relative" ref={colPickerRef}>
          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Settings2 size={12} /> Columns
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-stone-200 rounded-lg shadow-lg p-2 min-w-[140px]">
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1 hover:bg-stone-50 rounded cursor-pointer text-xs text-stone-700">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    className="w-3 h-3 rounded"
                  />
                  {PARTY_COLUMN_LABELS[col.id] ?? col.id}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-stone-50 border-b border-stone-200">
                {hg.headers.map((header) => (
                  <th key={header.id} className="text-left px-3 py-3 text-stone-500 font-medium whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-stone-800 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon sorted={header.column.getIsSorted()} />
                      </button>
                    )}
                  </th>
                ))}
                <th className="px-3 py-3 w-10" />
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-stone-50">
            {table.getRowModel().rows.map((row) => {
              const party = row.original
              return (
                <tr
                  key={row.id}
                  onClick={() => onOpenGuest(party.id)}
                  className="hover:bg-stone-50/60 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 max-w-[220px] truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <Pencil size={11} className="text-stone-300 hover:text-stone-600 transition-colors" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Party Row ──────────────────────────────────────────────────────────────────

function PartyRow({
  party, expanded, onToggle, onEdit, onDelete,
  memberByGuestId, filterMode, rehearsalGuestIds, searchQuery,
  onOpenGuest, updateParty,
}: {
  party: Party
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  memberByGuestId: Map<number, WeddingPartyMember>
  filterMode: FilterMode
  rehearsalGuestIds: Set<number>
  searchQuery: string
  onOpenGuest: (partyId: number, guestId: number) => void
  updateParty: ReturnType<typeof useUpdateParty>
}) {
  const addGuest = useAddGuest()
  const [showAddGuest, setShowAddGuest] = useState(false)

  async function setStatus(s: InviteStatus) {
    try { await updateParty.mutateAsync({ id: party.id, data: { status: s } }) }
    catch { toast.error('Failed to update') }
  }

  async function addPlusOne() {
    try {
      await addGuest.mutateAsync({
        partyId: party.id,
        data: { first_name: '+1', last_name: '', email: '', is_child: false, dietary_restrictions: '', label: '', is_plus_one: true },
      })
    } catch {
      toast.error('Failed to add +1')
    }
  }

  async function toggleRehearsalDinner() {
    try { await updateParty.mutateAsync({ id: party.id, data: { rehearsal_dinner: !party.rehearsal_dinner } }) }
    catch { toast.error('Failed to update') }
  }

  async function togglePhysicalCard() {
    try { await updateParty.mutateAsync({ id: party.id, data: { wants_physical_card: !party.wants_physical_card } }) }
    catch { toast.error('Failed to update') }
  }

  const isFiltered = filterMode !== 'all' || !!searchQuery
  const visibleGuests = isFiltered
    ? party.guests.filter(
        (g) =>
          guestMatchesFilter(g, filterMode, rehearsalGuestIds) &&
          guestMatchesSearch(g, party, searchQuery),
      )
    : party.guests
  const hiddenCount = party.guests.length - visibleGuests.length

  const attendingCount = party.guests.filter((g) => g.is_attending).length
  const totalCount = party.guests.length

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Party header row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <button onClick={onToggle} className="flex-1 text-left">
          <span className="text-sm font-medium text-stone-800">{party.name}</span>
          <span className="text-xs text-stone-400 ml-2">
            {totalCount} guest{totalCount !== 1 ? 's' : ''}
            {attendingCount > 0 && <span className="text-emerald-500 ml-1">· {attendingCount} attending</span>}
          </span>
        </button>
        {party.type && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium cursor-help"
            title={PARTY_TYPE_DESCRIPTIONS[party.type]}
          >
            {PARTY_TYPE_LABELS[party.type]}
          </span>
        )}
        {party.side && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium hidden sm:inline">
            {PARTY_SIDE_LABELS[party.side]}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); togglePhysicalCard() }}
          title={party.wants_physical_card ? 'Wants physical card — click to remove' : 'No physical card — click to add'}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors hidden sm:inline-block ${
            party.wants_physical_card
              ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
              : 'border border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-600'
          }`}
        >
          ✉
        </button>
        {party.plus_one_allowed && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium hidden sm:inline">
            +1 ok
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); toggleRehearsalDinner() }}
          title={party.rehearsal_dinner ? 'Invited to rehearsal dinner — click to remove' : 'Not invited to rehearsal dinner — click to add'}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors hidden sm:inline-block ${
            party.rehearsal_dinner
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'border border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-600'
          }`}
        >
          RD
        </button>
        <select
          value={party.status}
          onChange={(e) => setStatus(e.target.value as InviteStatus)}
          onClick={(e) => e.stopPropagation()}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-stone-400 ${INVITE_STATUS_COLORS[party.status]}`}
        >
          {(Object.entries(INVITE_STATUS_LABELS) as [InviteStatus, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <div className="flex gap-1 ml-1">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded guest rows */}
      {expanded && (
        <div className="border-t border-stone-50">
          {visibleGuests.length === 0 && !showAddGuest ? (
            <div className="px-10 py-3 text-xs text-stone-400 italic">
              {hiddenCount > 0 ? `${hiddenCount} guest${hiddenCount !== 1 ? 's' : ''} hidden by filter` : 'No guests yet'}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-50 bg-stone-50/60">
                  <th className="text-left px-10 py-2 text-stone-400 font-medium">Name</th>
                  <th className="text-left px-2 py-2 text-stone-400 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-2 py-2 text-stone-400 font-medium">Attending</th>
                  <th className="text-left px-2 py-2 text-stone-400 font-medium hidden sm:table-cell">Meal</th>
                  <th className="text-left px-2 py-2 text-stone-400 font-medium hidden md:table-cell">Dietary</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {visibleGuests.map((g) => (
                  <GuestRow
                    key={g.id}
                    guest={g}
                    party={party}
                    member={memberByGuestId.get(g.id)}
                    onOpenGuest={onOpenGuest}
                  />
                ))}
                {hiddenCount > 0 && visibleGuests.length > 0 && (
                  <tr>
                    <td colSpan={6} className="px-10 py-1.5 text-[10px] text-stone-400 italic border-t border-stone-50">
                      {hiddenCount} guest{hiddenCount !== 1 ? 's' : ''} hidden by filter
                    </td>
                  </tr>
                )}
                {showAddGuest && (
                  <AddGuestRow
                    partyId={party.id}
                    addGuest={addGuest}
                    onDone={() => setShowAddGuest(false)}
                  />
                )}
              </tbody>
            </table>
          )}
          <div className="px-10 py-2 border-t border-stone-50 flex gap-4">
            <button
              onClick={() => setShowAddGuest(true)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors"
            >
              <UserPlus size={12} /> Add guest
            </button>
            {party.plus_one_allowed && (
              <button
                onClick={addPlusOne}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-600 transition-colors"
              >
                <UserPlus size={12} /> Add +1
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Guest Row ─────────────────────────────────────────────────────────────────

function GuestRow({
  guest, party, member, onOpenGuest,
}: {
  guest: Guest
  party: Party
  member?: WeddingPartyMember
  onOpenGuest: (partyId: number, guestId: number) => void
}) {
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function toggleAttending() {
    const next = guest.is_attending === null ? true : guest.is_attending === true ? false : null
    try { await updateGuest.mutateAsync({ id: guest.id, data: { is_attending: next } }) }
    catch { toast.error('Failed to update') }
  }

  async function setMeal(meal: string) {
    try { await updateGuest.mutateAsync({ id: guest.id, data: { meal: meal as Guest['meal'] } }) }
    catch { toast.error('Failed to update') }
  }

  async function handleDelete() {
    try { await deleteGuest.mutateAsync(guest.id) }
    catch { toast.error('Failed to delete') }
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmModal
          title="Remove guest"
          message={`Remove ${guest.first_name} ${guest.last_name} from the guest list?`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      <tr className="border-b border-stone-50 last:border-0 hover:bg-stone-50/40">
        <td className="px-10 py-2 text-stone-700">
          <div className="flex items-center gap-1.5 flex-wrap">
            <InlineEditCell value={guest.first_name}
              onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { first_name: v } })} />
            {' '}
            <InlineEditCell value={guest.last_name ?? ''}
              onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { last_name: v } })} />
            {guest.is_plus_one && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">+1</span>
            )}
            {guest.is_child && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>
            )}
            <LabelBadge guest={guest} onOpenGuest={onOpenGuest} partyId={party.id} />
            {member && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium border"
                style={{ backgroundColor: member.color + '33', borderColor: member.color + '88', color: member.color }}
              >
                {member.role.replace('_', ' ')}
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-2 text-stone-400 hidden sm:table-cell">
          <InlineEditCell value={guest.email ?? ''} type="email"
            onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { email: v } })} />
        </td>
        <td className="px-2 py-2">
          <button
            onClick={toggleAttending}
            title="Click to cycle: Pending → Yes → No → Pending"
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
              guest.is_attending === true  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
              guest.is_attending === false ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' :
                                             'bg-stone-100 text-stone-400 hover:bg-stone-200'
            }`}
          >
            {guest.is_attending === true ? 'Yes' : guest.is_attending === false ? 'No' : 'Pending'}
          </button>
        </td>
        <td className="px-2 py-2 hidden sm:table-cell">
          <select
            value={guest.meal ?? ''}
            onChange={(e) => setMeal(e.target.value)}
            className="text-[11px] border-0 bg-transparent text-stone-500 focus:outline-none cursor-pointer"
          >
            {Object.entries(MEAL_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-2 hidden md:table-cell text-stone-400 text-[11px] max-w-[140px]">
          <InlineEditCell value={guest.dietary_restrictions ?? ''}
            onSave={(v) => updateGuest.mutateAsync({ id: guest.id, data: { dietary_restrictions: v } })} />
        </td>
        <td className="px-2 py-2">
          <div className="flex gap-0.5">
            <button
              onClick={() => onOpenGuest(party.id, guest.id)}
              className="p-1 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-600 transition-colors"
              title="Open full editor"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded hover:bg-rose-50 text-stone-300 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </td>
      </tr>
    </>
  )
}

// ── Inline Add Guest Row ───────────────────────────────────────────────────────

function AddGuestRow({
  partyId, addGuest, onDone,
}: {
  partyId: number
  addGuest: ReturnType<typeof useAddGuest>
  onDone: () => void
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]  = useState('')
  const [email, setEmail]        = useState('')
  const [isChild, setIsChild]    = useState(false)
  const [dietary, setDietary]    = useState('')
  const [search, setSearch]      = useState('')
  const { data: unassigned = [] } = useUnassignedGuests()
  const assignGuest = useUpdateGuest()

  async function handleSubmit() {
    if (!firstName) return
    try {
      await addGuest.mutateAsync({
        partyId,
        data: { first_name: firstName, last_name: lastName, email, is_child: isChild, dietary_restrictions: dietary, label: '' },
      })
      toast.success('Guest added')
      onDone()
    } catch {
      toast.error('Failed to add guest')
    }
  }

  async function handlePickExisting(guest: Guest) {
    try {
      await assignGuest.mutateAsync({ id: guest.id, data: { party_id: partyId } })
      toast.success(`${guest.first_name} ${guest.last_name} added to party`)
      onDone()
    } catch {
      toast.error('Failed to assign guest')
    }
  }

  const filtered = unassigned.filter((g) =>
    `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(search.toLowerCase())
  )

  if (mode === 'existing') {
    return (
      <tr className="bg-stone-50/60 border-b border-stone-100">
        <td colSpan={6} className="px-10 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                placeholder="Search unassigned guests…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 max-w-xs"
              />
              <button onClick={() => setMode('new')} className="text-xs text-stone-400 hover:text-stone-600">New instead</button>
              <button onClick={onDone} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
            </div>
            {unassigned.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No unassigned guests</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No matches</p>
            ) : (
              <div className="border border-stone-200 rounded overflow-hidden max-h-36 overflow-y-auto">
                {filtered.map((g) => (
                  <button key={g.id} onClick={() => handlePickExisting(g)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-stone-100 flex items-center gap-2 border-b border-stone-100 last:border-0">
                    <span className="font-medium text-stone-700">{g.first_name} {g.last_name}</span>
                    {g.email && <span className="text-stone-400">{g.email}</span>}
                    {g.is_child && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-100 text-sky-600">child</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="bg-stone-50/60 border-b border-stone-100">
      <td className="px-10 py-2">
        <div className="flex gap-1">
          <input autoFocus placeholder="First name *" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="w-24 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400" />
          <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="w-24 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400" />
        </div>
      </td>
      <td className="px-2 py-2 hidden sm:table-cell">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-36 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400" />
      </td>
      <td className="px-2 py-2">
        <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer">
          <input type="checkbox" checked={isChild} onChange={(e) => setIsChild(e.target.checked)} className="w-3 h-3" />
          Child
        </label>
      </td>
      <td className="px-2 py-2 hidden md:table-cell">
        <input placeholder="Dietary restrictions" value={dietary} onChange={(e) => setDietary(e.target.value)}
          className="w-36 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400" />
      </td>
      <td colSpan={2} className="px-2 py-2">
        <div className="flex gap-1 flex-wrap items-center">
          <button onClick={handleSubmit} disabled={!firstName || addGuest.isPending}
            className="px-2.5 py-1 text-xs text-white bg-stone-800 rounded hover:bg-stone-700 disabled:opacity-50">
            Add
          </button>
          <button onClick={onDone} className="px-2.5 py-1 text-xs text-stone-500 border border-stone-300 rounded hover:bg-stone-50">
            Cancel
          </button>
          {unassigned.length > 0 && (
            <button onClick={() => setMode('existing')} className="text-xs text-stone-400 hover:text-rose-600 transition-colors ml-1">
              or pick existing ({unassigned.length})
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Party Picker (searchable combobox) ────────────────────────────────────────

function PartyPicker({
  parties, onSelect, onNewParty, onCancel,
}: {
  parties: Party[]
  onSelect: (partyId: number) => void
  onNewParty: () => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const DROPDOWN_H = 228
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= DROPDOWN_H
        ? rect.bottom + 2
        : Math.max(8, rect.top - DROPDOWN_H)
      setDropdownPos({ top, left: rect.left })
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const inContainer = containerRef.current?.contains(e.target as Node)
      const inDropdown = dropdownRef.current?.contains(e.target as Node)
      if (!inContainer && !inDropdown) onCancel()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onCancel])

  const filtered = query
    ? parties.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : parties

  const dropdown = dropdownPos ? createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: '14rem', zIndex: 9999 }}
      className="bg-white border border-stone-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
    >
      {filtered.length === 0 ? (
        <p className="px-3 py-2 text-xs text-stone-400 italic">
          {query ? `No parties match "${query}"` : 'No parties yet'}
        </p>
      ) : (
        filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-stone-50 text-stone-700 border-b border-stone-50 last:border-0 transition-colors"
          >
            {p.name}
            {p.guests.length > 0 && (
              <span className="text-stone-400 ml-1.5">({p.guests.length})</span>
            )}
          </button>
        ))
      )}
      <button
        onClick={onNewParty}
        className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border-t border-stone-100 font-medium transition-colors"
      >
        + Create solo party
      </button>
    </div>,
    document.body,
  ) : null

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            ref={inputRef}
            placeholder="Search parties…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-6 pr-2 py-1 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 w-44"
          />
        </div>
        <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
          <X size={13} />
        </button>
      </div>
      {dropdown}
    </div>
  )
}

// ── Unassigned Guests Section ──────────────────────────────────────────────────

function UnassignedGuestsSection({
  parties, onOpenGuest,
}: {
  parties: Party[]
  onOpenGuest: (partyId: number, guestId?: number) => void
}) {
  const { data: unassigned = [], isLoading, isError } = useUnassignedGuests()
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()
  const createParty = useCreateParty()
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Guest | null>(null)
  const [search, setSearch] = useState('')

  const filtered = unassigned.filter((g) =>
    `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAssign(guestId: number, partyId: number) {
    try {
      await updateGuest.mutateAsync({ id: guestId, data: { party_id: partyId } })
      toast.success('Guest assigned')
      setAssigningId(null)
    } catch {
      toast.error('Failed to assign')
    }
  }

  async function handleNewParty(guest: Guest) {
    const partyName = `${guest.first_name} ${guest.last_name}`.trim()
    try {
      const party = await createParty.mutateAsync({
        name: partyName, type: '', category: '', status: 'planned',
        rehearsal_dinner: false, comments: '', address: '', wants_physical_card: false, side: '',
        plus_one_allowed: false, plus_one_count: 0,
      })
      await updateGuest.mutateAsync({ id: guest.id, data: { party_id: party.id } })
      toast.success(`Created party "${partyName}"`)
      onOpenGuest(party.id, guest.id)
    } catch {
      toast.error('Failed to create party')
    }
  }

  async function handleDelete(guest: Guest) {
    try { await deleteGuest.mutateAsync(guest.id) }
    catch { toast.error('Failed to delete') }
  }

  return (
    <div className="mt-6">
      {pendingDelete && (
        <ConfirmModal
          title="Remove guest"
          message={`Remove ${pendingDelete.first_name} ${pendingDelete.last_name} from the guest list?`}
          confirmLabel="Remove"
          onConfirm={() => handleDelete(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-stone-700">Unassigned Guests</h3>
        {!isLoading && !isError && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            {unassigned.length}
          </span>
        )}
        <span className="text-xs text-stone-400">— imported without a party</span>
        {unassigned.length > 5 && (
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 w-40"
          />
        )}
      </div>
      {isLoading ? (
        <p className="text-xs text-stone-400 py-4">Loading…</p>
      ) : isError ? (
        <p className="text-xs text-red-500 py-4">Failed to load unassigned guests.</p>
      ) : unassigned.length === 0 ? null : (
        <div className="bg-white border border-amber-100 rounded-xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-4 text-xs text-stone-400 italic">No matches for "{search}"</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-amber-50/60 border-b border-amber-100">
                  <th className="text-left px-4 py-2.5 text-stone-500 font-medium">Name</th>
                  <th className="text-left px-3 py-2.5 text-stone-500 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-3 py-2.5 text-stone-500 font-medium">Assign to Party</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((guest) => (
                  <tr key={guest.id} className="hover:bg-stone-50/40">
                    <td className="px-4 py-2.5 text-stone-800 font-medium">
                      {guest.first_name} {guest.last_name}
                      {guest.is_child && (
                        <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-stone-400 hidden sm:table-cell">{guest.email || '—'}</td>
                    <td className="px-3 py-2.5">
                      {assigningId === guest.id ? (
                        <PartyPicker
                          parties={parties}
                          onSelect={(partyId) => handleAssign(guest.id, partyId)}
                          onNewParty={() => { setAssigningId(null); handleNewParty(guest) }}
                          onCancel={() => setAssigningId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setAssigningId(guest.id)}
                          className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors"
                        >
                          <UserPlus size={12} /> Assign
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setPendingDelete(guest)}
                        className="p-1 rounded hover:bg-rose-50 text-stone-300 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Party Modal (name only — full details in PartyEditor) ─────────────────────

function PartyModal({
  onSave, onClose, saving,
}: {
  onSave: (name: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [name, setName] = useState('')

  function doSave() {
    if (!name.trim()) return
    onSave(name.trim())
  }

  useEnterSubmit(doSave, !name.trim() || saving)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">Add Party</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">
          <label className="block text-xs font-medium text-stone-600 mb-1">Party name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smith Family"
            autoFocus
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <p className="mt-2 text-xs text-stone-400">You can fill in the rest once the party is created.</p>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          <button
            disabled={!name.trim() || saving}
            onClick={doSave}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create & edit →'}
          </button>
        </div>
      </div>
    </div>
  )
}
