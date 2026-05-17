import { useState } from 'react'
import { Toaster } from 'sonner'
import { ContactsTab } from './ContactsTab'
import { EmailsTab } from './EmailsTab'

type Tab = 'contacts' | 'emails'

const TABS: { id: Tab; label: string }[] = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'emails',   label: 'Emails' },
]

export function GuestsApp() {
  const [tab, setTab] = useState<Tab>('contacts')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Toaster richColors position="top-right" />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Guest Management</h1>
        <p className="text-sm text-stone-500 mt-1">Manage your contacts, filter by role, and send invitations.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'contacts' && <ContactsTab />}
      {tab === 'emails'   && <EmailsTab />}
    </div>
  )
}
