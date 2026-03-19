import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, UserPlus, Upload, X } from 'lucide-react'
import {
  useParties, useCreateParty, useUpdateParty, useDeleteParty,
  useAddGuest, useUpdateGuest, useDeleteGuest,
} from './api'
import type { Guest, Party, PartyFormData, PartyType, PartySide, InviteStatus } from './types'
import { MEAL_LABELS, PARTY_TYPE_LABELS, PARTY_TYPE_DESCRIPTIONS, PARTY_SIDE_LABELS, INVITE_STATUS_LABELS, INVITE_STATUS_COLORS } from './types'

// ── CSV Import Modal ───────────────────────────────────────────────────────────

interface ImportStats {
  parties_created: number
  parties_updated: number
  guests_created: number
  guests_updated: number
  skipped: number
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
    setLoading(true)
    setError(null)
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
              <li>{result.parties_created} parties created, {result.parties_updated} updated</li>
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
            <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-500 space-y-1">
              <p className="font-medium text-stone-700">Expected CSV columns (with header row):</p>
              <p className="font-mono">party_name, first_name, last_name, party_type, is_child, category, is_invited, email</p>
              <p className="mt-1">• <code>party_type</code>: formal / fun / family / work</p>
              <p>• <code>is_child</code> / <code>is_invited</code>: y / yes / true / 1</p>
            </div>

            <div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-stone-300 rounded-lg py-6 text-sm text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors">
                {file ? (
                  <span className="text-stone-700 font-medium">{file.name}</span>
                ) : (
                  <span>Click to choose a .csv file</span>
                )}
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

// ── Guest List Tab ─────────────────────────────────────────────────────────────

export function GuestListTab() {
  const { data: parties = [], isLoading } = useParties()
  const createParty = useCreateParty()
  const updateParty = useUpdateParty()
  const deleteParty = useDeleteParty()

  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

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
    if (!confirm('Delete this party and all their guests?')) return
    try {
      await deleteParty.mutateAsync(id)
      toast.success('Party deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const totalGuests = parties.reduce((n, p) => n + p.guests.length, 0)
  const attending = parties.reduce((n, p) => n + p.guests.filter((g) => g.is_attending).length, 0)

  if (isLoading) return <div className="text-sm text-stone-400">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500">
          {parties.length} parties · {totalGuests} guests
          {attending > 0 && <span className="ml-2 text-emerald-600">{attending} attending</span>}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-700 transition-colors"
          >
            <Plus size={14} /> Add Party
          </button>
        </div>
      </div>

      {parties.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No parties yet.</p>
          <button onClick={openAdd} className="mt-3 text-sm text-rose-600 hover:underline">Add the first one →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {parties.map((party) => (
            <PartyRow
              key={party.id}
              party={party}
              expanded={expanded.has(party.id)}
              onToggle={() => toggleExpand(party.id)}
              onEdit={() => openEdit(party)}
              onDelete={() => handleDeleteParty(party.id)}
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

      {showImportModal && (
        <ImportCsvModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  )
}

// ── Party Row ──────────────────────────────────────────────────────────────────

function PartyRow({
  party, expanded, onToggle, onEdit, onDelete,
}: {
  party: Party
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const updateParty = useUpdateParty()
  const addGuest = useAddGuest()
  const [showAddGuest, setShowAddGuest] = useState(false)

  async function setStatus(status: InviteStatus) {
    try {
      await updateParty.mutateAsync({ id: party.id, data: { status } })
    } catch {
      toast.error('Failed to update')
    }
  }

  const attendingCount = party.guests.filter((g) => g.is_attending).length

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
            {party.guests.length} guest{party.guests.length !== 1 ? 's' : ''}
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
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium hidden sm:inline">+1</span>
        )}

        {/* Status dropdown */}
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
          {party.guests.length === 0 && !showAddGuest ? (
            <div className="px-10 py-3 text-xs text-stone-400 italic">No guests yet</div>
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
                {party.guests.map((g) => (
                  <GuestRow key={g.id} guest={g} />
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

// ── Guest Row ─────────────────────────────────────────────────────────────────

function GuestRow({ guest }: { guest: Guest }) {
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()

  async function toggleAttending() {
    try {
      await updateGuest.mutateAsync({ id: guest.id, data: { is_attending: !guest.is_attending } })
    } catch {
      toast.error('Failed to update')
    }
  }

  async function setMeal(meal: string) {
    try {
      await updateGuest.mutateAsync({ id: guest.id, data: { meal: meal as Guest['meal'] } })
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${guest.first_name}?`)) return
    try {
      await deleteGuest.mutateAsync(guest.id)
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <tr className="border-b border-stone-50 last:border-0 hover:bg-stone-50/40">
      <td className="px-10 py-2 text-stone-700">
        {guest.first_name} {guest.last_name}
        {guest.is_child && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-medium">child</span>}
      </td>
      <td className="px-2 py-2 text-stone-400 hidden sm:table-cell">{guest.email || '—'}</td>
      <td className="px-2 py-2">
        <button
          onClick={toggleAttending}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
            guest.is_attending === true  ? 'bg-emerald-100 text-emerald-700' :
            guest.is_attending === false ? 'bg-rose-100 text-rose-600' :
                                           'bg-stone-100 text-stone-400'
          }`}
        >
          {guest.is_attending === true ? 'Yes' : guest.is_attending === false ? 'No' : 'Unknown'}
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
      <td className="px-2 py-2 hidden md:table-cell text-stone-400 text-[11px] max-w-[140px] truncate" title={guest.dietary_restrictions || undefined}>
        {guest.dietary_restrictions || '—'}
      </td>
      <td className="px-2 py-2">
        <button onClick={handleDelete} className="p-1 rounded hover:bg-rose-50 text-stone-300 hover:text-rose-400 transition-colors">
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
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
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]  = useState('')
  const [email, setEmail]        = useState('')
  const [isChild, setIsChild]    = useState(false)
  const [dietary, setDietary]    = useState('')

  async function handleSubmit() {
    if (!firstName) return
    try {
      await addGuest.mutateAsync({ partyId, data: { first_name: firstName, last_name: lastName, email, is_child: isChild, dietary_restrictions: dietary } })
      toast.success('Guest added')
      onDone()
    } catch {
      toast.error('Failed to add guest')
    }
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
      <td colSpan={1} className="px-2 py-2">
        <div className="flex gap-1">
          <button onClick={handleSubmit} disabled={!firstName || addGuest.isPending}
            className="px-2.5 py-1 text-xs text-white bg-stone-800 rounded hover:bg-stone-700 disabled:opacity-50">
            Add
          </button>
          <button onClick={onDone} className="px-2.5 py-1 text-xs text-stone-500 border border-stone-300 rounded hover:bg-stone-50">
            Cancel
          </button>
        </div>
      </td>
    </tr>
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
  const [name, setName]           = useState(initial?.name ?? '')
  const [type, setType]           = useState<PartyType>(initial?.type ?? '')
  const [category, setCategory]   = useState(initial?.category ?? '')
  const [status, setStatus]       = useState<InviteStatus>(initial?.status ?? 'planned')
  const [rehearsal, setRehearsal] = useState(initial?.rehearsal_dinner ?? false)
  const [comments, setComments]   = useState(initial?.comments ?? '')
  const [address, setAddress]     = useState(initial?.address ?? '')
  const [side, setSide]           = useState<PartySide>(initial?.side ?? '')
  const [plusOne, setPlusOne]     = useState(initial?.plus_one_allowed ?? false)

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
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" checked={rehearsal} onChange={(e) => setRehearsal(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300" />
              Rehearsal dinner
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" checked={plusOne} onChange={(e) => setPlusOne(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300" />
              +1 allowed
            </label>
          </div>
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
            onClick={() => name && onSave({ name, type, category, status, rehearsal_dinner: rehearsal, comments, address, side, plus_one_allowed: plusOne })}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add party'}
          </button>
        </div>
      </div>
    </div>
  )
}
