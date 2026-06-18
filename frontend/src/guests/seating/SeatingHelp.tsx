import { Modal } from '../components/Modal'

/** Usage instructions for the seating planner. */
export function SeatingHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How seating works" onClose={onClose} size="lg">
      <div className="space-y-4 text-sm text-stone-600">
        <p>
          The <strong>Unseated</strong> list on the left holds everyone who still needs a seat.
          The <strong>Tables</strong> on the right are where you place them.
        </p>

        <div>
          <p className="font-semibold text-stone-800">Seating a guest</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Click a table’s <strong>Add guests</strong> button, then type a name.</li>
            <li>Press <strong>Enter</strong> (or tap <strong>Add</strong>) to seat that guest.</li>
            <li>Press <strong>Ctrl+Enter</strong> (or tap <strong>Add party</strong>) to seat their whole party together.</li>
            <li>Or <strong>tick several names</strong> and tap <strong>Add</strong> to seat a custom group at once.</li>
            <li>You can also <strong>drag</strong> a guest from Unseated straight onto a table.</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-stone-800">Moving &amp; removing</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>On a seated guest, tap <strong>Move</strong> to send them to a different table.</li>
            <li>Tap <strong>Remove</strong> to take them off the table (back to Unseated).</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-stone-800">Reading the labels</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              The grey label like <span className="text-stone-700">“College Friends · 4”</span> is a guest’s
              <strong> party</strong> and <strong>how many people</strong> are in it.
            </li>
            <li>
              The little dot is their RSVP:{' '}
              <span className="inline-flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> confirmed</span>,{' '}
              <span className="inline-flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" /> pending</span>.
            </li>
            <li>A table turns red and flags a warning if you seat more people than it holds.</li>
          </ul>
        </div>

        <p className="text-xs text-stone-400">
          Tip: use <strong>Hide full tables</strong> to focus on the tables that still have room.
        </p>
      </div>
    </Modal>
  )
}
