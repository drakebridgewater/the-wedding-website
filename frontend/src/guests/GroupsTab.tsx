import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useGroups, useMembers, useCreateGroup, useUpdateGroup, useDeleteGroup } from './api'
import type { GroupFormData, MemberRole, WeddingPartyGroup, WeddingPartyMember } from './types'
import { ROLE_LABELS, ROLE_ORDER } from './types'

export function GroupsTab() {
  const { data: groups = [], isLoading } = useGroups()
  const { data: members = [] } = useMembers()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()

  const [editing, setEditing] = useState<WeddingPartyGroup | null>(null)
  const [showModal, setShowModal] = useState(false)

  function openAdd() { setEditing(null); setShowModal(true) }
  function openEdit(g: WeddingPartyGroup) { setEditing(g); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null) }

  async function handleSave(data: GroupFormData) {
    try {
      if (editing) {
        await updateGroup.mutateAsync({ id: editing.id, data })
        toast.success('Group updated')
      } else {
        await createGroup.mutateAsync(data)
        toast.success('Group created')
      }
      closeModal()
    } catch {
      toast.error('Failed to save group')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this group?')) return
    try {
      await deleteGroup.mutateAsync(id)
      toast.success('Group deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (isLoading) return <div className="text-sm text-stone-400">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-700 transition-colors"
        >
          <Plus size={14} /> Add Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No groups yet.</p>
          <button onClick={openAdd} className="mt-3 text-sm text-rose-600 hover:underline">Add the first one →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-stone-100 shadow-sm px-4 py-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <h3 className="text-sm font-semibold text-stone-800">{g.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(g)} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {g.description && <p className="text-xs text-stone-500 mb-2">{g.description}</p>}
              <div className="flex flex-wrap gap-1">
                {g.members.length === 0 ? (
                  <span className="text-xs text-stone-300 italic">No members</span>
                ) : g.members.map((m) => (
                  <span key={m.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                    style={{ backgroundColor: m.color }}>
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <GroupModal
          initial={editing ?? undefined}
          members={members}
          onSave={handleSave}
          onClose={closeModal}
          saving={createGroup.isPending || updateGroup.isPending}
        />
      )}
    </div>
  )
}

function GroupModal({
  initial, members, onSave, onClose, saving,
}: {
  initial?: WeddingPartyGroup
  members: WeddingPartyMember[]
  onSave: (data: GroupFormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? '#6366f1')
  const [order, setOrder] = useState(initial?.order ?? 0)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(initial?.members.map((m) => m.id) ?? [])
  )

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Group members by role
  const grouped = ROLE_ORDER.reduce<Record<string, WeddingPartyMember[]>>((acc, role) => {
    const g = members.filter((m) => m.role === role)
    if (g.length) acc[role] = g
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-stone-900">{initial ? 'Edit Group' : 'Add Group'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Group name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Color</label>
            <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-1.5">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
              <span className="text-xs text-stone-500 font-mono">{color}</span>
            </div>
          </div>
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-2">Members</label>
              <div className="space-y-2">
                {Object.entries(grouped).map(([role, group]) => (
                  <div key={role}>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">{ROLE_LABELS[role as MemberRole]}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.map((m) => {
                        const sel = selectedIds.has(m.id)
                        return (
                          <button key={m.id} type="button" onClick={() => toggle(m.id)}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                            style={sel ? { backgroundColor: m.color, borderColor: m.color, color: '#fff' }
                                       : { borderColor: m.color, color: m.color, backgroundColor: `${m.color}15` }}>
                            {m.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          <button
            disabled={!name || saving}
            onClick={() => name && onSave({ name, description, color, order, member_ids: Array.from(selectedIds) })}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add group'}
          </button>
        </div>
      </div>
    </div>
  )
}
