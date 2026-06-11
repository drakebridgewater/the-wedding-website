import { useState } from 'react'
import { Toaster } from 'sonner'
import { ContactsTab } from './contacts/ContactsTab'
import { EmailsTab } from './emails/EmailsTab'
import { WeddingPartyTab } from './wedding-party/WeddingPartyTab'
import { SeatingTab } from './seating/SeatingTab'
import { RehearsalDinnerTab } from './rehearsal/RehearsalDinnerTab'
import { PartyEditor } from './editor/PartyEditor'

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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <Toaster richColors position="top-right" />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Guest Management</h1>
        <p className="text-sm text-stone-500 mt-1 hidden sm:block">Manage your contacts, filter by role, and send invitations.</p>
      </div>

      {/* Tab bar — scrolls horizontally on narrow screens */}
      <div className="flex gap-1 mb-4 sm:mb-6 border-b border-stone-200 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
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
      {tab === 'wedding-party'    && <WeddingPartyTab onOpenGuest={openGuest} />}
      {tab === 'rehearsal-dinner' && <RehearsalDinnerTab onOpenGuest={openGuest} />}
      {tab === 'seating'          && <SeatingTab onOpenGuest={openGuest} />}
      {tab === 'emails'           && <EmailsTab onOpenGuest={openGuest} />}

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
