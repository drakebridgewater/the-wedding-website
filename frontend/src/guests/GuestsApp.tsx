import { useState } from 'react'
import { Toaster } from 'sonner'
import { ContactsTab } from './ContactsTab'
import { EmailsTab } from './EmailsTab'
import { WeddingPartyTab } from './WeddingPartyTab'
import { SeatingTab } from './SeatingTab'
import { RehearsalDinnerTab } from './RehearsalDinnerTab'
import { PartyEditor } from './PartyEditor'

type Tab = 'contacts' | 'wedding-party' | 'seating' | 'emails' | 'rehearsal-dinner'

const TABS: { id: Tab; label: string }[] = [
  { id: 'contacts',          label: 'Contacts' },
  { id: 'wedding-party',     label: 'Wedding Party' },
  { id: 'rehearsal-dinner',  label: 'Rehearsal Dinner' },
  { id: 'seating',           label: 'Seating' },
  { id: 'emails',            label: 'Emails' },
]

export function GuestsApp() {
  const [tab, setTab] = useState<Tab>('contacts')
  const [editorTarget, setEditorTarget] = useState<{ partyId: number; guestId?: number } | null>(null)

  function openGuest(partyId: number, guestId?: number) {
    setEditorTarget({ partyId, guestId })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Toaster richColors position="top-right" />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Guest Management</h1>
        <p className="text-sm text-stone-500 mt-1">Manage your contacts, filter by role, and send invitations.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'contacts'         && <ContactsTab onOpenGuest={openGuest} />}
      {tab === 'wedding-party'    && <WeddingPartyTab />}
      {tab === 'rehearsal-dinner' && <RehearsalDinnerTab onOpenGuest={openGuest} />}
      {tab === 'seating'          && <SeatingTab />}
      {tab === 'emails'           && <EmailsTab />}

      {editorTarget && (
        <PartyEditor
          partyId={editorTarget.partyId}
          initialGuestId={editorTarget.guestId}
          onClose={() => setEditorTarget(null)}
        />
      )}
    </div>
  )
}
