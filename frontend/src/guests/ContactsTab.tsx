import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown, ChevronRight, Pencil, Trash2, Plus, UserPlus,
  Upload, X, LayoutList, Table2, Download, Search,
} from 'lucide-react'
import {
  useParties, useCreateParty, useUpdateParty, useDeleteParty,
  useAddGuest, useUpdateGuest, useDeleteGuest, useUnassignedGuests,
  useMembers, useGroups, useAssignGuestRole, useRemoveGuestRole,
} from './api'
import type {
  Guest, Party, PartyFormData, PartyType, PartySide, InviteStatus,
  WeddingPartyMember, MemberRole,
} from './types'
import {
  MEAL_LABELS, PARTY_TYPE_LABELS, PARTY_TYPE_DESCRIPTIONS, PARTY_SIDE_LABELS,
  INVITE_STATUS_LABELS, INVITE_STATUS_COLORS, ROLE_LABELS, ROLE_ORDER,
} from './types'

// ── Role defaults ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<MemberRole, string> = {
  bride:        '#f9a8d4',
  groom:        '#93c5fd',
  maid_of_honor:'#c4b5fd',
  best_man:     '#6ee7b7',
  bridesmaid:   '#fda4af',
  groomsman:    '#a5b4fc',
  other:        '#d1d5db',
}

type FilterMode = 'all' | MemberRole | 'no_role' | `group:${number}`

// ── Filter helpers ─────────────────────────────────────────────────────────────

function guestMatchesFilter(
  guest: Guest,
  filterMode: FilterMode,
  memberByGuestId: Map<number, WeddingPartyMember>,
  guestIdsByGroup: Map<number, Set<number>>,
): boolean {
  if (filterMode === 'all') return true
  if (filterMode === 'no_role') return !memberByGuestId.has(guest.id)
  if (filterMode.startsWith('group:')) {
    const groupId = Number(filterMode.slice(6))
    return guestIdsByGroup.get(groupId)?.has(guest.id) ?? false
  }
  return memberByGuestId.get(guest.id)?.role === (filterMode as MemberRole)
}

function guestMatchesSearch(guest: Guest, party: Party, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(q) ||
    (guest.email?.toLowerCase() ?? '').includes(q) ||
    party.name.toLowerCase().includes(q)
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title, message, confirmLabel = 'Delete', onConfirm, onClose,
}: {
  title: string; message: string; confirmLabel?: string
  onConfirm: () => void; onClose: () => void
}) {
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

// ── Role Badge ─────────────────────────────────────────────────────────────────

function RoleBadge({
  guest, member, onAssign, onRemove, isPending,
}: {
  guest: Guest
  member?: WeddingPartyMember
  onAssign: (role: MemberRole, color: string) => void
  onRemove: () => void
  isPending?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // suppress unused warning
  void guest

  return (
    <div className="relative inline-flex" ref={ref}>
      {member ? (
        <button
          onClick={() => setOpen(!open)}
          style={{ backgroundColor: member.color + '33', borderColor: member.color + '88' }}
          className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium border cursor-pointer hover:opacity-80 transition-opacity"
          disabled={isPending}
        >
          <span style={{ color: member.color }}>{ROLE_LABELS[member.role]}</span>
          <ChevronDown size={8} style={{ color: member.color }} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="text-[9px] px-1.5 py-0.5 rounded-full border border-dashed border-stone-300 text-stone-400 hover:border-stone-500 hover:text-stone-500 transition-colors cursor-pointer"
          disabled={isPending}
        >
          + role
        </button>
      )}
      {open && (
        <div className="absolute left-0 top-full mt-0.5 z-30 bg-white border border-stone-200 rounded-lg shadow-lg min-w-[140px] py-1 text-xs">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              onClick={() => {
                onAssign(role, member?.color ?? ROLE_COLORS[role])
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-stone-50 transition-colors ${
                member?.role === role ? 'font-semibold text-stone-900' : 'text-stone-600'
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ backgroundColor: ROLE_COLORS[role] }}
              />
              {ROLE_LABELS[role]}
            </button>
          ))}
          {member && (
            <div className="border-t border-stone-100 mt-1 pt-1">
              <button
                onClick={() => { onRemove(); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-500 transition-colors"
              >
                Remove role
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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

export function ContactsTab() {
  const { data: parties = [], isLoading } = useParties()
  const { data: members = [] } = useMembers()
  const { data: groups = [] } = useGroups()
  const createParty = useCreateParty()
  const updateParty = useUpdateParty()
  const deleteParty = useDeleteParty()
  const assignRole = useAssignGuestRole()
  const removeRole = useRemoveGuestRole()

  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pendingDeletePartyId, setPendingDeletePartyId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [tableView, setTableView] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Derived maps ─────────────────────────────────────────────────────────────

  const memberByGuestId = useMemo(
    () => new Map(members.filter((m) => m.guest_id != null).map((m) => [m.guest_id!, m])),
    [members],
  )

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<MemberRole, number>> = {}
    for (const m of members) {
      if (m.guest_id != null) counts[m.role] = (counts[m.role] ?? 0) + 1
    }
    return counts
  }, [members])

  const guestIdsByGroup = useMemo(
    () => new Map(
      groups.map((g) => [
        g.id,
        new Set(g.members.filter((m) => m.guest_id != null).map((m) => m.guest_id!)),
      ]),
    ),
    [groups],
  )

  const totalGuests = parties.reduce((n, p) => n + p.guests.length, 0)
  const noRoleCount = totalGuests - members.filter((m) => m.guest_id != null).length

  // ── Filtered parties/rows ─────────────────────────────────────────────────────

  const filteredParties = useMemo(() => {
    if (filterMode === 'all' && !searchQuery) return parties
    return parties.filter((p) => {
      // Party name matches search → show it (when no role filter)
      if (filterMode === 'all' && searchQuery && p.name.toLowerCase().includes(searchQuery.toLowerCase())) return true
      return p.guests.some(
        (g) =>
          guestMatchesFilter(g, filterMode, memberByGuestId, guestIdsByGroup) &&
          guestMatchesSearch(g, p, searchQuery),
      )
    })
  }, [parties, filterMode, memberByGuestId, guestIdsByGroup, searchQuery])

  const filteredFlatRows = useMemo(
    () =>
      parties.flatMap((p) =>
        p.guests
          .filter(
            (g) =>
              guestMatchesFilter(g, filterMode, memberByGuestId, guestIdsByGroup) &&
              guestMatchesSearch(g, p, searchQuery),
          )
          .map((g) => ({ guest: g, party: p })),
      ),
    [parties, filterMode, memberByGuestId, guestIdsByGroup, searchQuery],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openAdd() { setEditingParty(null); setShowPartyModal(true) }
  function openEdit(p: Party) { setEditingParty(p); setShowPartyModal(true) }
  function closeModal() { setShowPartyModal(false); setEditingParty(null) }

  async function handleSaveParty(data: PartyFormData) {
    try {
      if (editingParty) {
        await updateParty.mutateAsync({ id: editingParty.id, data })
        toast.success('Party updated')
      } else {
        await createParty.mutateAsync(data)
        toast.success('Party added')
      }
      closeModal()
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

  async function handleAssignRole(guestId: number, role: MemberRole, color: string) {
    try {
      await assignRole.mutateAsync({ guestId, role, color })
    } catch {
      toast.error('Failed to assign role')
    }
  }

  async function handleRemoveRole(guestId: number) {
    try {
      await removeRole.mutateAsync(guestId)
    } catch {
      toast.error('Failed to remove role')
    }
  }

  const attending = parties.reduce((n, p) => n + p.guests.filter((g) => g.is_attending).length + p.plus_one_count, 0)

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
        {ROLE_ORDER.map((role) => {
          const count = roleCounts[role] ?? 0
          if (count === 0) return null
          return (
            <FilterChip
              key={role}
              label={ROLE_LABELS[role]}
              count={count}
              active={filterMode === role}
              onClick={() => setFilterMode(role)}
            />
          )
        })}
        {noRoleCount > 0 && (
          <FilterChip
            label="No role"
            count={noRoleCount}
            active={filterMode === 'no_role'}
            onClick={() => setFilterMode('no_role')}
          />
        )}
        {groups.length > 0 && (
          <>
            <span className="text-stone-300 text-xs px-0.5 select-none">|</span>
            {groups.map((g) => {
              const count = guestIdsByGroup.get(g.id)?.size ?? 0
              if (count === 0) return null
              return (
                <FilterChip
                  key={g.id}
                  label={g.name}
                  count={count}
                  active={filterMode === `group:${g.id}`}
                  onClick={() => setFilterMode(`group:${g.id}` as FilterMode)}
                  outline
                />
              )
            })}
          </>
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
          {/* View toggle */}
          <div className="flex rounded-lg border border-stone-200 overflow-hidden">
            <button
              onClick={() => setTableView(false)}
              title="Party view"
              className={`p-2 transition-colors ${!tableView ? 'bg-stone-800 text-white' : 'bg-white text-stone-400 hover:text-stone-600'}`}
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => setTableView(true)}
              title="Flat table view"
              className={`p-2 transition-colors ${tableView ? 'bg-stone-800 text-white' : 'bg-white text-stone-400 hover:text-stone-600'}`}
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
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-700 transition-colors">
            <Plus size={14} /> Add Party
          </button>
        </div>
      </div>

      {parties.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No contacts yet.</p>
          <button onClick={openAdd} className="mt-3 text-sm text-rose-600 hover:underline">Add the first one →</button>
        </div>
      ) : isFiltered && filteredParties.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No contacts match this filter.</p>
          <button onClick={() => { setFilterMode('all'); setSearchQuery('') }} className="mt-3 text-sm text-stone-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : tableView ? (
        <FlatGuestTable
          rows={filteredFlatRows}
          memberByGuestId={memberByGuestId}
          onAssignRole={handleAssignRole}
          onRemoveRole={handleRemoveRole}
          rolePending={assignRole.isPending || removeRole.isPending}
        />
      ) : (
        <div className="space-y-2">
          {filteredParties.map((party) => (
            <PartyRow
              key={party.id}
              party={party}
              expanded={expanded.has(party.id)}
              onToggle={() => toggleExpand(party.id)}
              onEdit={() => openEdit(party)}
              onDelete={() => setPendingDeletePartyId(party.id)}
              memberByGuestId={memberByGuestId}
              filterMode={filterMode}
              guestIdsByGroup={guestIdsByGroup}
              searchQuery={searchQuery}
              onAssignRole={handleAssignRole}
              onRemoveRole={handleRemoveRole}
              rolePending={assignRole.isPending || removeRole.isPending}
            />
          ))}
        </div>
      )}

      {showPartyModal && (
        <PartyModal
          initial={editingParty ?? undefined}
          onSave={handleSaveParty}
          onClose={closeModal}
          saving={createParty.isPending || updateParty.isPending}
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
      <UnassignedGuestsSection parties={parties} />
    </div>
  )
}

// ── Flat Guest Table ───────────────────────────────────────────────────────────

function FlatGuestTable({
  rows, memberByGuestId, onAssignRole, onRemoveRole, rolePending,
}: {
  rows: { guest: Guest; party: Party }[]
  memberByGuestId: Map<number, WeddingPartyMember>
  onAssignRole: (guestId: number, role: MemberRole, color: string) => void
  onRemoveRole: (guestId: number) => void
  rolePending: boolean
}) {
  if (rows.length === 0) return (
    <div className="text-center py-16 text-stone-400 text-sm">No contacts match.</div>
  )

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-4 py-3 text-stone-500 font-medium">Name</th>
              <th className="text-left px-3 py-3 text-stone-500 font-medium">Role</th>
              <th className="text-left px-3 py-3 text-stone-500 font-medium hidden sm:table-cell">Party</th>
              <th className="text-left px-3 py-3 text-stone-500 font-medium hidden md:table-cell">Category</th>
              <th className="text-left px-3 py-3 text-stone-500 font-medium hidden sm:table-cell">Email</th>
              <th className="text-left px-3 py-3 text-stone-500 font-medium">Attending</th>
              <th className="text-left px-3 py-3 text-stone-500 font-medium hidden sm:table-cell">Meal</th>
              <th className="text-left px-3 py-3 text-stone-500 font-medium hidden md:table-cell">Dietary</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rows.map(({ guest, party }) => (
              <FlatGuestRow
                key={guest.id}
                guest={guest}
                party={party}
                member={memberByGuestId.get(guest.id)}
                onAssignRole={onAssignRole}
                onRemoveRole={onRemoveRole}
                rolePending={rolePending}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FlatGuestRow({
  guest, party, member, onAssignRole, onRemoveRole, rolePending,
}: {
  guest: Guest
  party: Party
  member?: WeddingPartyMember
  onAssignRole: (guestId: number, role: MemberRole, color: string) => void
  onRemoveRole: (guestId: number) => void
  rolePending: boolean
}) {
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()
  const [editOpen, setEditOpen]           = useState(false)
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

  async function handleSave(data: Partial<Guest>) {
    try {
      await updateGuest.mutateAsync({ id: guest.id, data })
      toast.success('Guest updated')
      setEditOpen(false)
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleDelete() {
    try { await deleteGuest.mutateAsync(guest.id) }
    catch { toast.error('Failed to delete') }
  }

  return (
    <>
      {editOpen && (
        <GuestEditModal
          guest={guest}
          onSave={handleSave}
          onClose={() => setEditOpen(false)}
          saving={updateGuest.isPending}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Remove guest"
          message={`Remove ${guest.first_name} ${guest.last_name} from the guest list?`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      <tr className="hover:bg-stone-50/40 transition-colors">
        <td className="px-4 py-2.5 text-stone-800">
          {guest.first_name} {guest.last_name}
          {guest.is_child && (
            <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <RoleBadge
            guest={guest}
            member={member}
            onAssign={(role, color) => onAssignRole(guest.id, role, color)}
            onRemove={() => onRemoveRole(guest.id)}
            isPending={rolePending}
          />
        </td>
        <td className="px-3 py-2.5 text-stone-500 hidden sm:table-cell">{party.name}</td>
        <td className="px-3 py-2.5 text-stone-400 hidden md:table-cell">{party.category || '—'}</td>
        <td className="px-3 py-2.5 text-stone-400 hidden sm:table-cell">{guest.email || '—'}</td>
        <td className="px-3 py-2.5">
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
        <td className="px-3 py-2.5 hidden sm:table-cell">
          <select
            value={guest.meal ?? ''}
            onChange={(e) => setMeal(e.target.value)}
            className="text-[11px] border-0 bg-transparent text-stone-500 focus:outline-none cursor-pointer"
          >
            {Object.entries(MEAL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2.5 text-stone-400 hidden md:table-cell max-w-[160px] truncate"
            title={guest.dietary_restrictions || undefined}>
          {guest.dietary_restrictions || '—'}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex gap-0.5">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-600 transition-colors"
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

// ── Party Row ──────────────────────────────────────────────────────────────────

function PartyRow({
  party, expanded, onToggle, onEdit, onDelete,
  memberByGuestId, filterMode, guestIdsByGroup, searchQuery,
  onAssignRole, onRemoveRole, rolePending,
}: {
  party: Party
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  memberByGuestId: Map<number, WeddingPartyMember>
  filterMode: FilterMode
  guestIdsByGroup: Map<number, Set<number>>
  searchQuery: string
  onAssignRole: (guestId: number, role: MemberRole, color: string) => void
  onRemoveRole: (guestId: number) => void
  rolePending: boolean
}) {
  const updateParty = useUpdateParty()
  const addGuest = useAddGuest()
  const [showAddGuest, setShowAddGuest] = useState(false)

  async function setStatus(s: InviteStatus) {
    try { await updateParty.mutateAsync({ id: party.id, data: { status: s } }) }
    catch { toast.error('Failed to update') }
  }

  async function setPlusOneCount(delta: number) {
    const next = Math.max(0, party.plus_one_count + delta)
    try { await updateParty.mutateAsync({ id: party.id, data: { plus_one_count: next } }) }
    catch { toast.error('Failed to update') }
  }

  // When filters are active, show only matching guests; otherwise show all
  const isFiltered = filterMode !== 'all' || !!searchQuery
  const visibleGuests = isFiltered
    ? party.guests.filter(
        (g) =>
          guestMatchesFilter(g, filterMode, memberByGuestId, guestIdsByGroup) &&
          guestMatchesSearch(g, party, searchQuery),
      )
    : party.guests
  const hiddenCount = party.guests.length - visibleGuests.length

  const attendingCount = party.guests.filter((g) => g.is_attending).length + party.plus_one_count
  const totalCount = party.guests.length + party.plus_one_count

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
        {party.plus_one_allowed && (
          <div
            className="flex items-center gap-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 font-medium hidden sm:flex"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlusOneCount(-1)}
              disabled={party.plus_one_count === 0}
              className="px-1.5 py-0.5 rounded-l-full hover:bg-amber-200 disabled:opacity-30 transition-colors"
              title="Remove a +1"
            >−</button>
            <span className="px-1">{party.plus_one_count > 0 ? `+${party.plus_one_count}` : '+1?'}</span>
            <button
              onClick={() => setPlusOneCount(1)}
              className="px-1.5 py-0.5 rounded-r-full hover:bg-amber-200 transition-colors"
              title="Add a +1"
            >+</button>
          </div>
        )}
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
          {visibleGuests.length === 0 && party.plus_one_count === 0 && !showAddGuest ? (
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
                    member={memberByGuestId.get(g.id)}
                    onAssignRole={(role, color) => onAssignRole(g.id, role, color)}
                    onRemoveRole={() => onRemoveRole(g.id)}
                    rolePending={rolePending}
                  />
                ))}
                {hiddenCount > 0 && visibleGuests.length > 0 && (
                  <tr>
                    <td colSpan={6} className="px-10 py-1.5 text-[10px] text-stone-400 italic border-t border-stone-50">
                      {hiddenCount} guest{hiddenCount !== 1 ? 's' : ''} hidden by filter
                    </td>
                  </tr>
                )}
                {/* Phantom rows for unnamed +1s */}
                {Array.from({ length: party.plus_one_count }).map((_, i) => (
                  <tr key={`plus-one-${i}`} className="border-b border-stone-50 last:border-0">
                    <td className="px-10 py-2 text-stone-400 italic">+1 (unnamed)</td>
                    <td className="px-2 py-2 hidden sm:table-cell" />
                    <td className="px-2 py-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Yes</span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                ))}
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
          <div className="px-10 py-2 border-t border-stone-50">
            <button
              onClick={() => setShowAddGuest(true)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors"
            >
              <UserPlus size={12} /> Add guest
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Guest Edit Modal ──────────────────────────────────────────────────────────

function GuestEditModal({
  guest, onSave, onClose, saving,
}: {
  guest: Guest
  onSave: (data: Partial<Guest>) => void
  onClose: () => void
  saving: boolean
}) {
  const [firstName, setFirstName]     = useState(guest.first_name)
  const [lastName, setLastName]       = useState(guest.last_name)
  const [email, setEmail]             = useState(guest.email)
  const [isChild, setIsChild]         = useState(guest.is_child)
  const [dietary, setDietary]         = useState(guest.dietary_restrictions)
  const [attending, setAttending]     = useState<string>(
    guest.is_attending === true ? 'yes' : guest.is_attending === false ? 'no' : '',
  )
  const [meal, setMeal]               = useState(guest.meal ?? '')

  function handleSave() {
    onSave({
      first_name: firstName,
      last_name: lastName,
      email,
      is_child: isChild,
      dietary_restrictions: dietary,
      is_attending: attending === 'yes' ? true : attending === 'no' ? false : null,
      meal: meal as Guest['meal'],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">Edit Guest</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">First name *</label>
              <input
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Attending</label>
              <select
                value={attending}
                onChange={(e) => setAttending(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="">Pending</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Meal</label>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as Guest['meal'])}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                {Object.entries(MEAL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Dietary restrictions</label>
            <input
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Gluten-free, vegan, nut allergy…"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isChild}
              onChange={(e) => setIsChild(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300"
            />
            Child
          </label>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">
            Cancel
          </button>
          <button
            disabled={!firstName || saving}
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Guest Row ─────────────────────────────────────────────────────────────────

function GuestRow({
  guest, member, onAssignRole, onRemoveRole, rolePending,
}: {
  guest: Guest
  member?: WeddingPartyMember
  onAssignRole: (role: MemberRole, color: string) => void
  onRemoveRole: () => void
  rolePending: boolean
}) {
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()
  const [editOpen, setEditOpen]       = useState(false)
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

  async function handleSave(data: Partial<Guest>) {
    try {
      await updateGuest.mutateAsync({ id: guest.id, data })
      toast.success('Guest updated')
      setEditOpen(false)
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleDelete() {
    try { await deleteGuest.mutateAsync(guest.id) }
    catch { toast.error('Failed to delete') }
  }

  return (
    <>
      {editOpen && (
        <GuestEditModal
          guest={guest}
          onSave={handleSave}
          onClose={() => setEditOpen(false)}
          saving={updateGuest.isPending}
        />
      )}
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
            {guest.first_name} {guest.last_name}
            {guest.is_child && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>
            )}
            <RoleBadge
              guest={guest}
              member={member}
              onAssign={onAssignRole}
              onRemove={onRemoveRole}
              isPending={rolePending}
            />
          </div>
        </td>
        <td className="px-2 py-2 text-stone-400 hidden sm:table-cell">{guest.email || '—'}</td>
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
        <td className="px-2 py-2 hidden md:table-cell text-stone-400 text-[11px] max-w-[140px] truncate"
            title={guest.dietary_restrictions || undefined}>
          {guest.dietary_restrictions || '—'}
        </td>
        <td className="px-2 py-2">
          <div className="flex gap-0.5">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-600 transition-colors"
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
        data: { first_name: firstName, last_name: lastName, email, is_child: isChild, dietary_restrictions: dietary },
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
      setDropdownPos({ top: rect.bottom + 2, left: rect.left })
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

function UnassignedGuestsSection({ parties }: { parties: Party[] }) {
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
        rehearsal_dinner: false, comments: '', address: '', side: '',
        plus_one_allowed: false, plus_one_count: 0,
      })
      await updateGuest.mutateAsync({ id: guest.id, data: { party_id: party.id } })
      toast.success(`Created party "${partyName}"`)
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

// ── Party Modal ────────────────────────────────────────────────────────────────

function PartyModal({
  initial, onSave, onClose, saving,
}: {
  initial?: Party
  onSave: (data: PartyFormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [name, setName]             = useState(initial?.name ?? '')
  const [type, setType]             = useState<PartyType>(initial?.type ?? '')
  const [category, setCategory]     = useState(initial?.category ?? '')
  const [status, setStatus]         = useState<InviteStatus>(initial?.status ?? 'planned')
  const [rehearsal, setRehearsal]   = useState(initial?.rehearsal_dinner ?? false)
  const [comments, setComments]     = useState(initial?.comments ?? '')
  const [address, setAddress]       = useState(initial?.address ?? '')
  const [side, setSide]             = useState<PartySide>(initial?.side ?? '')
  const [plusOne, setPlusOne]       = useState(initial?.plus_one_allowed ?? false)
  const [plusOneCount, setPlusOneCount] = useState(initial?.plus_one_count ?? 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">{initial ? 'Edit Party' : 'Add Party'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Party name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith Family"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Type
                {type && PARTY_TYPE_DESCRIPTIONS[type] && (
                  <span className="ml-1.5 font-normal text-stone-400" title={PARTY_TYPE_DESCRIPTIONS[type]}>ⓘ</span>
                )}
              </label>
              <select value={type} onChange={(e) => setType(e.target.value as PartyType)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
                {Object.entries(PARTY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v} title={PARTY_TYPE_DESCRIPTIONS[v] ?? ''}>{l}</option>
                ))}
              </select>
              {type && PARTY_TYPE_DESCRIPTIONS[type] && (
                <p className="mt-1 text-[11px] text-stone-400">{PARTY_TYPE_DESCRIPTIONS[type]}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. family"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as InviteStatus)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
                {(Object.entries(INVITE_STATUS_LABELS) as [InviteStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Side</label>
              <select value={side} onChange={(e) => setSide(e.target.value as PartySide)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
                {Object.entries(PARTY_SIDE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" checked={rehearsal} onChange={(e) => setRehearsal(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300" />
              Rehearsal dinner
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" checked={plusOne} onChange={(e) => {
                setPlusOne(e.target.checked)
                if (!e.target.checked) setPlusOneCount(0)
              }} className="w-4 h-4 rounded border-stone-300" />
              +1 allowed
            </label>
          </div>
          {plusOne && (
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Unnamed +1s attending
                <span className="ml-1 font-normal text-stone-400">(seats reserved for unknown guests)</span>
              </label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPlusOneCount(Math.max(0, plusOneCount - 1))}
                  className="w-7 h-7 rounded border border-stone-300 text-stone-500 hover:bg-stone-50 text-sm font-medium disabled:opacity-30"
                  disabled={plusOneCount === 0}>−</button>
                <span className="w-6 text-center text-sm font-medium text-stone-800">{plusOneCount}</span>
                <button type="button" onClick={() => setPlusOneCount(plusOneCount + 1)}
                  className="w-7 h-7 rounded border border-stone-300 text-stone-500 hover:bg-stone-50 text-sm font-medium">+</button>
                {plusOneCount > 0 && (
                  <span className="text-xs text-amber-600 ml-1">{plusOneCount} seat{plusOneCount !== 1 ? 's' : ''} reserved</span>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Mailing address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
              placeholder="Street, City, State ZIP"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Comments</label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          <button
            disabled={!name || saving}
            onClick={() => name && onSave({
              name, type, category, status, rehearsal_dinner: rehearsal,
              comments, address, side, plus_one_allowed: plusOne, plus_one_count: plusOneCount,
            })}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add party'}
          </button>
        </div>
      </div>
    </div>
  )
}
