import { useState } from 'react'
import { format } from 'date-fns'
import { useSentEmails } from '../api'

/** Expandable log of every email delivered through the app. */
export function SendLog() {
  const { data: log = [], isLoading } = useSentEmails()
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div>
      <h3 className="text-sm font-medium text-stone-700 mb-3">Send log</h3>
      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}
      {!isLoading && log.length === 0 && (
        <p className="text-sm text-stone-400">No emails sent yet.</p>
      )}
      <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100">
        {log.map((entry) => (
          <div key={entry.id}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 text-left"
              onClick={() => setExpanded((prev) => prev === entry.id ? null : entry.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-800 truncate">{entry.subject}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {entry.party_name ?? '—'} · {entry.template_name ?? 'no template'} · {entry.recipients.length} recipient(s)
                </p>
              </div>
              <span className="text-xs text-stone-400 shrink-0">
                {format(new Date(entry.sent_at), 'MMM d, h:mm a')}
              </span>
              <span className="text-stone-400 text-xs">{expanded === entry.id ? '▲' : '▼'}</span>
            </button>
            {expanded === entry.id && (
              <div className="px-4 py-3 bg-stone-50 border-t border-stone-100">
                <p className="text-xs text-stone-500 mb-2 break-words">To: {entry.recipients.join(', ')}</p>
                <div
                  className="prose prose-sm max-w-none text-stone-700"
                  dangerouslySetInnerHTML={{ __html: entry.body_html }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
