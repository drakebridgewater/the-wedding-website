import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from './api'
import type { MemberFormData, MemberRole, WeddingPartyMember } from './types'
import { ROLE_LABELS, ROLE_ORDER } from './types'


export function WeddingPartyTab() {
  const { data: members = [], isLoading } = useMembers()
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  const [editing, setEditing] = useState<WeddingPartyMember | null>(null)
  const [showModal, setShowModal] = useState(false)

  function openAdd() { setEditing(null); setShowModal(true) }
  function openEdit(m: WeddingPartyMember) { setEditing(m); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null) }

  async function handleSave(data: MemberFormData) {
    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, data })
        toast.success('Member updated')
      } else {
        await createMember.mutateAsync(data)
        toast.success('Member added')
      }
      closeModal()
    } catch {
      toast.error('Failed to save member')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this member?')) return
    try {
      await deleteMember.mutateAsync(id)
      toast.success('Member deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  // Group by role preserving ROLE_ORDER
  const grouped = ROLE_ORDER.reduce<Record<string, WeddingPartyMember[]>>((acc, role) => {
    const group = members.filter((m) => m.role === role)
    if (group.length) acc[role] = group
    return acc
  }, {})

  if (isLoading) return <div className="text-sm text-stone-400">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500">{members.length} members</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-700 transition-colors"
        >
          <Plus size={14} /> Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No wedding party members yet.</p>
          <button onClick={openAdd} className="mt-3 text-sm text-rose-600 hover:underline">Add the first one →</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([role, group]) => (
            <div key={role}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                {ROLE_LABELS[role as MemberRole]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 shadow-sm px-4 py-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-stone-800 truncate">{m.name}</p>
                        {m.guest_id && (
                          <span className="flex-shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Guest ✓</span>
                        )}
                      </div>
                      {m.email && <p className="text-xs text-stone-400 truncate">{m.email}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <MemberModal
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={closeModal}
          saving={createMember.isPending || updateMember.isPending}
        />
      )}
    </div>
  )
}

function MemberModal({
  initial, onSave, onClose, saving,
}: {
  initial?: WeddingPartyMember
  onSave: (data: MemberFormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<MemberFormData>({
    name:  initial?.name  ?? '',
    role:  initial?.role  ?? 'other',
    color: initial?.color ?? '#6366f1',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    order: initial?.order ?? 0,
  })

  function set<K extends keyof MemberFormData>(k: K, v: MemberFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">{initial ? 'Edit Member' : 'Add Member'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Role *</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value as MemberRole)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
                {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Color</label>
              <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-1.5">
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
                <span className="text-xs text-stone-500 font-mono">{form.color}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          <button
            disabled={!form.name || saving}
            onClick={() => form.name && onSave(form)}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add member'}
          </button>
        </div>
      </div>
    </div>
  )
}
