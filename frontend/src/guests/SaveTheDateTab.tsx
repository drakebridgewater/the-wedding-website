import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  useSaveTheDateSettings, useUpdateSaveTheDateSettings,
  useUploadSaveTheDateImage, useRemoveSaveTheDateImage,
  useSendSaveTheDates, useSaveTheDateSentList,
  useParties,
} from './api'
import type { Party } from './types'

// ── Confirm modal (inline, lightweight) ───────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <p className="text-sm text-stone-700 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ── Party checklist row ────────────────────────────────────────────────────────

function PartyCheckRow({ party, checked, sentAt, onToggle }: {
  party: Party
  checked: boolean
  sentAt: string | null
  onToggle: () => void
}) {
  const guestCount = party.guests.length
  return (
    <label className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onToggle} className="rounded border-stone-300" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-stone-800 truncate block">{party.name}</span>
        <span className="text-xs text-stone-400">
          {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
          {sentAt && (
            <span className="ml-2 text-emerald-600">✓ sent {format(new Date(sentAt), 'MMM d')}</span>
          )}
        </span>
      </div>
      {party.status === 'invited' && (
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">invited</span>
      )}
    </label>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function SaveTheDateTab() {
  const { data: settings, isLoading: settingsLoading } = useSaveTheDateSettings()
  const { data: parties = [] } = useParties()
  const { data: sentList = [] } = useSaveTheDateSentList()

  const updateSettings = useUpdateSaveTheDateSettings()
  const uploadImage = useUploadSaveTheDateImage()
  const removeImage = useRemoveSaveTheDateImage()
  const sendMutation = useSendSaveTheDates()

  const imageInputRef = useRef<HTMLInputElement>(null)
  const [bgColor, setBgColor] = useState(settings?.background_color ?? '#fff3e8')
  const [fontColor, setFontColor] = useState(settings?.font_color ?? '#666666')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmSend, setConfirmSend] = useState(false)

  // Keep local color state in sync when settings load
  const settingsBg = settings?.background_color
  const settingsFg = settings?.font_color
  if (settingsBg && bgColor !== settingsBg && !updateSettings.isPending) {
    setBgColor(settingsBg)
  }
  if (settingsFg && fontColor !== settingsFg && !updateSettings.isPending) {
    setFontColor(settingsFg)
  }

  // Sent lookup by party id
  const sentMap = new Map(sentList.map((s) => [s.id, s.save_the_date_sent]))

  const invitedParties = parties.filter((p) => p.status === 'invited')
  const toggle = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadImage.mutate(file, {
      onSuccess: () => toast.success('Image uploaded'),
      onError: () => toast.error('Image upload failed'),
    })
    e.target.value = ''
  }

  const handleSaveColors = () => {
    updateSettings.mutate({ background_color: bgColor, font_color: fontColor }, {
      onSuccess: () => toast.success('Settings saved'),
      onError: () => toast.error('Failed to save settings'),
    })
  }

  const handleSend = () => {
    sendMutation.mutate(Array.from(selected), {
      onSuccess: ({ sent, errors }) => {
        toast.success(`Sent to ${sent} ${sent === 1 ? 'party' : 'parties'}`)
        if (errors.length) toast.error(`${errors.length} error(s): ${errors[0]}`)
        setSelected(new Set())
        setConfirmSend(false)
      },
      onError: () => { toast.error('Send failed'); setConfirmSend(false) },
    })
  }

  if (settingsLoading) return <p className="text-sm text-stone-400">Loading…</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left column: image + colors */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Email appearance</h2>

          {/* Image upload */}
          <div className="space-y-2 mb-4">
            <label className="block text-xs font-medium text-stone-500">Photo</label>
            {settings?.image_url ? (
              <div className="flex items-start gap-3">
                <img
                  src={settings.image_url}
                  alt="Save the date"
                  className="h-32 w-48 object-cover rounded-lg border border-stone-200"
                />
                <div className="flex flex-col gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadImage.isPending}
                    className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage.mutate(undefined, {
                      onSuccess: () => toast.success('Image removed'),
                      onError: () => toast.error('Failed to remove image'),
                    })}
                    disabled={removeImage.isPending}
                    className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadImage.isPending}
                className="px-4 py-3 text-sm border border-dashed border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 text-stone-500 w-full"
              >
                {uploadImage.isPending ? 'Uploading…' : '+ Upload photo'}
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Color pickers */}
          <div className="flex gap-4 mb-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Background color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-12 rounded cursor-pointer border border-stone-200"
                />
                <span className="text-xs text-stone-500 font-mono">{bgColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Text color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="h-8 w-12 rounded cursor-pointer border border-stone-200"
                />
                <span className="text-xs text-stone-500 font-mono">{fontColor}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveColors}
            disabled={updateSettings.isPending}
            className="px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {updateSettings.isPending ? 'Saving…' : 'Save appearance'}
          </button>
        </div>

        {/* Sent history */}
        <div>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Sent history ({sentList.length})</h2>
          {sentList.length === 0 ? (
            <p className="text-sm text-stone-400">No save-the-dates sent yet.</p>
          ) : (
            <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-64 overflow-y-auto">
              {sentList.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-stone-700">{s.name}</span>
                  <span className="text-xs text-stone-400">{format(new Date(s.save_the_date_sent), 'MMM d, yyyy')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column: send panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">Send to parties</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set(invitedParties.map((p) => p.id)))}
              className="text-xs text-indigo-600 hover:underline"
            >
              All invited ({invitedParties.length})
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-stone-400 hover:underline">Clear</button>
          </div>
        </div>

        <div className="border border-stone-200 rounded-lg overflow-y-auto max-h-96 divide-y divide-stone-100">
          {parties.length === 0 && <p className="text-sm text-stone-400 p-3">No parties yet.</p>}
          {parties.map((party) => (
            <PartyCheckRow
              key={party.id}
              party={party}
              checked={selected.has(party.id)}
              sentAt={sentMap.get(party.id) ?? null}
              onToggle={() => toggle(party.id)}
            />
          ))}
        </div>

        <button
          disabled={selected.size === 0 || sendMutation.isPending}
          onClick={() => setConfirmSend(true)}
          className="w-full py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
        >
          {sendMutation.isPending ? 'Sending…' : `Send to ${selected.size} ${selected.size === 1 ? 'party' : 'parties'}`}
        </button>
      </div>

      {confirmSend && (
        <ConfirmModal
          message={`Send save-the-dates to ${selected.size} ${selected.size === 1 ? 'party' : 'parties'}? This will deliver real emails.`}
          onConfirm={handleSend}
          onCancel={() => setConfirmSend(false)}
        />
      )}
    </div>
  )
}
