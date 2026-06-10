import { useState } from 'react'
import { toast } from 'sonner'
import { BellOff, BellRing, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCreateMember, useDeleteMember, useMembers, useUpdateMember } from '../api'
import type { MemberFormData, MemberRole, WeddingPartyMember } from '../types'
import { ROLE_LABELS, ROLE_ORDER } from '../types'
import { Button, IconButton } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { MemberModal } from './MemberModal'

export function WeddingPartyTab() {
  const { data: members = [], isLoading } = useMembers()
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  const [editing, setEditing] = useState<WeddingPartyMember | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<WeddingPartyMember | null>(null)

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

  async function handleToggleInformed(m: WeddingPartyMember) {
    try {
      await updateMember.mutateAsync({ id: m.id, data: { is_informed: !m.is_informed } })
      toast.success(m.is_informed ? `${m.name} marked as not yet informed` : `${m.name} marked as informed`)
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleTogglePublic(m: WeddingPartyMember) {
    try {
      await updateMember.mutateAsync({ id: m.id, data: { is_public: !m.is_public } })
      toast.success(m.is_public ? `${m.name} hidden from public page` : `${m.name} now visible on public page`)
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleDelete(id: number) {
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
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={14} /> Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          message="No wedding party members yet."
          actionLabel="Add the first one →"
          onAction={openAdd}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([role, group]) => (
            <div key={role}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                {ROLE_LABELS[role as MemberRole]}
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {group.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 shadow-sm px-4 py-3 w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)]">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-stone-800 truncate">{m.name}</p>
                        {m.guest_id && (
                          <span className="flex-shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Guest ✓</span>
                        )}
                        {m.is_informed ? (
                          <span className="flex-shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">Informed ✓</span>
                        ) : (
                          <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Not informed</span>
                        )}
                        {m.is_public && (
                          <span className="flex-shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Public ✓</span>
                        )}
                      </div>
                      {m.email && <p className="text-xs text-stone-400 truncate">{m.email}</p>}
                    </div>
                    <div className="flex flex-shrink-0">
                      <IconButton
                        title={m.is_informed ? 'Mark as not yet informed' : 'Mark as informed'}
                        onClick={() => handleToggleInformed(m)}
                        className={m.is_informed ? 'text-blue-400 hover:bg-blue-50 hover:text-blue-600' : 'text-amber-400 hover:bg-amber-50 hover:text-amber-600'}
                      >
                        {m.is_informed ? <BellRing size={13} /> : <BellOff size={13} />}
                      </IconButton>
                      <IconButton
                        title={m.is_public ? 'Hide from public page' : 'Show on public page'}
                        onClick={() => handleTogglePublic(m)}
                        className={m.is_public ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700' : ''}
                      >
                        {m.is_public ? <Eye size={13} /> : <EyeOff size={13} />}
                      </IconButton>
                      <IconButton title="Edit member" onClick={() => openEdit(m)}>
                        <Pencil size={13} />
                      </IconButton>
                      <IconButton title="Delete member" danger onClick={() => setPendingDelete(m)}>
                        <Trash2 size={13} />
                      </IconButton>
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
      {pendingDelete && (
        <ConfirmDialog
          title="Delete member"
          message={`Delete ${pendingDelete.name} from the wedding party?`}
          onConfirm={() => handleDelete(pendingDelete.id)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
