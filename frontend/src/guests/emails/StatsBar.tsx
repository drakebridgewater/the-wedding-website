import { useParties, useSentEmails } from '../api'

/** Headline numbers for the email workflow. */
export function StatsBar() {
  const { data: parties = [] } = useParties()
  const { data: log = [] } = useSentEmails()

  const invited = parties.filter((p) => p.status === 'invited').length
  const sent = parties.filter((p) => p.invitation_sent).length
  const opened = parties.filter((p) => p.invitation_opened).length
  const responded = parties.filter((p) => p.rsvp_responded_at).length

  const stats = [
    { label: 'Invited', value: invited },
    { label: 'Emails sent', value: log.length },
    { label: 'Invite sent', value: sent },
    { label: 'Opened', value: opened },
    { label: "RSVP'd", value: responded },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-stone-800">{value}</p>
          <p className="text-xs text-stone-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}
