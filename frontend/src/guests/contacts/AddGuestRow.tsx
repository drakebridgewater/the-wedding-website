import { useState } from 'react'
import { toast } from 'sonner'
import { useUnassignedGuests, useUpdateGuest, type useAddGuest } from '../api'
import type { Guest } from '../types'

/**
 * Inline row at the bottom of an expanded party card: create a new guest
 * or attach an existing unassigned one.
 */
export function AddGuestRow({
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

  const inputCls = 'border border-stone-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400'

  if (mode === 'existing') {
    return (
      <tr className="bg-stone-50/60 border-b border-stone-100">
        <td colSpan={6} className="px-4 sm:px-10 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                autoFocus
                placeholder="Search unassigned guests…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`flex-1 max-w-xs ${inputCls}`}
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
                    className="w-full text-left px-3 py-2 text-xs hover:bg-stone-100 flex items-center gap-2 border-b border-stone-100 last:border-0">
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
      <td colSpan={6} className="px-4 sm:px-10 py-2">
        <div className="flex gap-1.5 flex-wrap items-center">
          <input autoFocus placeholder="First name *" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className={`w-28 ${inputCls}`} />
          <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className={`w-28 ${inputCls}`} />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className={`w-40 hidden sm:block ${inputCls}`} />
          <input placeholder="Dietary restrictions" value={dietary} onChange={(e) => setDietary(e.target.value)}
            className={`w-40 hidden md:block ${inputCls}`} />
          <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer">
            <input type="checkbox" checked={isChild} onChange={(e) => setIsChild(e.target.checked)} className="w-3.5 h-3.5" />
            Child
          </label>
          <button onClick={handleSubmit} disabled={!firstName || addGuest.isPending}
            className="px-3 py-1.5 text-xs text-white bg-stone-800 rounded hover:bg-stone-700 disabled:opacity-50">
            Add
          </button>
          <button onClick={onDone} className="px-3 py-1.5 text-xs text-stone-500 border border-stone-300 rounded hover:bg-stone-50">
            Cancel
          </button>
          {unassigned.length > 0 && (
            <button onClick={() => setMode('existing')} className="text-xs text-stone-400 hover:text-rose-600 transition-colors">
              or pick existing ({unassigned.length})
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
