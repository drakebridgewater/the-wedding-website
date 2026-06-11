import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Pencil } from 'lucide-react'
import { useParties, useSendEmailTemplate } from '../api'
import type { EmailTemplate, Party } from '../types'
import { ConfirmDialog } from '../components/ConfirmDialog'

type MarkAs = 'save_the_date' | 'invitation' | null

const MARK_OPTIONS: { value: MarkAs; label: string }[] = [
  { value: null,            label: 'None' },
  { value: 'save_the_date', label: 'Save the Date' },
  { value: 'invitation',    label: 'Invitation' },
]

function PartyCheckRow({
  party, checked, onToggle, onOpenGuest,
}: {
  party: Party
  checked: boolean
  onToggle: () => void
  onOpenGuest?: (partyId: number, guestId?: number) => void
}) {
  const guestCount = party.guests.length

  return (
    <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onToggle} className="rounded border-stone-300 w-4 h-4" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-stone-800 truncate block">{party.name}</span>
        <span className="text-xs text-stone-400">
          {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
          {party.save_the_date_sent && (
            <span className="ml-2 text-sky-600">STD {format(new Date(party.save_the_date_sent), 'MMM d')}</span>
          )}
          {party.invitation_sent && (
            <span className="ml-2 text-emerald-600">inv {format(new Date(party.invitation_sent), 'MMM d')}</span>
          )}
        </span>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        party.status === 'invited' ? 'bg-emerald-100 text-emerald-700' :
        party.status === 'planned' ? 'bg-amber-100 text-amber-700' :
        'bg-stone-100 text-stone-400'
      }`}>
        {party.status}
      </span>
      {onOpenGuest && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenGuest(party.id) }}
          title="Edit party"
          aria-label={`Edit ${party.name}`}
          className="p-2 -m-1 rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0"
        >
          <Pencil size={12} />
        </button>
      )}
    </label>
  )
}

/** Pick recipient parties and deliver the active template. */
export function SendPanel({
  template, onOpenGuest,
}: {
  template: EmailTemplate | null
  onOpenGuest?: (partyId: number, guestId?: number) => void
}) {
  const { data: parties = [] } = useParties()
  const sendMutation = useSendEmailTemplate()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmSend, setConfirmSend] = useState(false)
  const [markAs, setMarkAs] = useState<MarkAs>(null)

  const invitedParties = parties.filter((p) => p.status === 'invited')

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleSend = () => {
    if (!template || selected.size === 0) return
    sendMutation.mutate(
      { templateId: template.id, partyIds: Array.from(selected), markAs },
      {
        onSuccess: ({ sent, errors }) => {
          toast.success(`Sent to ${sent} ${sent === 1 ? 'party' : 'parties'}`)
          if (errors.length) toast.error(`${errors.length} error(s): ${errors[0]}`)
          setSelected(new Set())
          setConfirmSend(false)
        },
        onError: () => { toast.error('Send failed'); setConfirmSend(false) },
      }
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-700">Send to parties</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set(invitedParties.map((p) => p.id)))}
              className="text-xs text-indigo-600 hover:underline py-1"
            >
              All invited ({invitedParties.length})
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-stone-400 hover:underline py-1">Clear</button>
          </div>
        </div>

        {/* Party checklist */}
        <div className="border border-stone-200 rounded-lg overflow-y-auto max-h-72 divide-y divide-stone-100">
          {parties.length === 0 && (
            <p className="text-sm text-stone-400 p-3">No parties yet.</p>
          )}
          {parties.map((party) => (
            <PartyCheckRow
              key={party.id}
              party={party}
              checked={selected.has(party.id)}
              onToggle={() => toggle(party.id)}
              onOpenGuest={onOpenGuest}
            />
          ))}
        </div>

        {/* Mark as tracking */}
        <div>
          <p className="text-xs font-medium text-stone-500 mb-1.5">Mark send as</p>
          <div className="flex gap-1 flex-wrap">
            {MARK_OPTIONS.map(({ value, label }) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setMarkAs(value)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  markAs === value
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!template || selected.size === 0 || sendMutation.isPending}
          onClick={() => setConfirmSend(true)}
          className="w-full py-2.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
        >
          {sendMutation.isPending ? 'Sending…' : `Send to ${selected.size} ${selected.size === 1 ? 'party' : 'parties'}`}
        </button>
      </div>

      {confirmSend && (
        <ConfirmDialog
          title="Send emails"
          message={`Send "${template?.name}" to ${selected.size} ${selected.size === 1 ? 'party' : 'parties'}? This will deliver real emails.`}
          confirmLabel="Send"
          danger={false}
          onConfirm={handleSend}
          onClose={() => setConfirmSend(false)}
        />
      )}
    </>
  )
}
