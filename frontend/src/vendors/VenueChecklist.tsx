import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  category: string
  label: string
}

const VENUE_CHECKLIST: ChecklistItem[] = [
  // Booking & Contract
  { id: 'deposit_amount',       category: 'Booking & Contract', label: 'Confirm deposit amount and payment schedule' },
  { id: 'cancellation_policy',  category: 'Booking & Contract', label: 'Understand cancellation / refund policy in writing' },
  { id: 'date_hold',            category: 'Booking & Contract', label: "Ask how long they'll hold your date without a deposit" },
  { id: 'liability_insurance',  category: 'Booking & Contract', label: 'Check if you must provide event liability insurance' },
  { id: 'force_majeure',        category: 'Booking & Contract', label: 'Review force majeure / weather clause' },
  { id: 'name_on_contract',     category: 'Booking & Contract', label: 'Confirm legal name on contract matches your legal name' },

  // Pricing Gotchas
  { id: 'overtime_fees',        category: 'Pricing Gotchas', label: 'Ask about overtime fees (cost per hour after end time)' },
  { id: 'cake_cutting_fee',     category: 'Pricing Gotchas', label: 'Ask about cake cutting fee' },
  { id: 'corkage_fee',          category: 'Pricing Gotchas', label: 'Ask about corkage fee if bringing your own alcohol' },
  { id: 'service_charge',       category: 'Pricing Gotchas', label: 'Confirm whether service charge & tax are included in quote' },
  { id: 'vendor_meals',         category: 'Pricing Gotchas', label: 'Ask if vendor meals are required and at what cost' },
  { id: 'setup_teardown_fee',   category: 'Pricing Gotchas', label: 'Check if setup / teardown time is included or extra' },
  { id: 'min_spend',            category: 'Pricing Gotchas', label: 'Confirm minimum guest count or food & beverage minimum' },

  // Logistics
  { id: 'load_in_time',         category: 'Logistics', label: 'Confirm vendor load-in / setup start time' },
  { id: 'load_out_deadline',    category: 'Logistics', label: 'Confirm hard cleanup / load-out deadline' },
  { id: 'noise_curfew',         category: 'Logistics', label: 'Ask about noise curfew or amplified music cutoff time' },
  { id: 'parking',              category: 'Logistics', label: "Confirm parking capacity and whether it's free" },
  { id: 'shuttle',              category: 'Logistics', label: 'Ask if shuttle / valet service can be arranged' },
  { id: 'rehearsal_access',     category: 'Logistics', label: 'Ask when rehearsal access is available' },

  // Space & Facilities
  { id: 'bridal_suite',         category: 'Space & Facilities', label: 'Confirm bridal suite availability and access time' },
  { id: 'groom_suite',          category: 'Space & Facilities', label: 'Ask about groom / groomsmen getting-ready space' },
  { id: 'restrooms',            category: 'Space & Facilities', label: 'Check restroom count, accessibility, and proximity' },
  { id: 'ceremony_separate',    category: 'Space & Facilities', label: "Confirm ceremony + reception spaces don't overlap in time" },
  { id: 'rain_backup',          category: 'Space & Facilities', label: 'Ask about rain / weather backup plan (outdoor venues)' },
  { id: 'av_system',            category: 'Space & Facilities', label: 'Confirm AV / sound system availability and quality' },
  { id: 'wifi',                 category: 'Space & Facilities', label: 'Check WiFi reliability (for DJ, photo booth, live-stream)' },
  { id: 'power_outlets',        category: 'Space & Facilities', label: 'Ask about power access for band, vendors, lighting' },
  { id: 'handicap_access',      category: 'Space & Facilities', label: 'Verify ADA / wheelchair accessibility throughout' },

  // Vendors
  { id: 'preferred_vendors',    category: 'Vendors', label: "Ask if there's a required or exclusive preferred vendor list" },
  { id: 'outside_caterer',      category: 'Vendors', label: 'Confirm whether outside caterers are allowed' },
  { id: 'alcohol_policy',       category: 'Vendors', label: 'Understand alcohol policy and bartender requirements' },
  { id: 'coordinator_included', category: 'Vendors', label: 'Confirm if a day-of coordinator is included' },
  { id: 'security_required',    category: 'Vendors', label: 'Ask if on-site security is required (and at what cost)' },

  // Décor
  { id: 'candles',              category: 'Décor', label: 'Ask if open-flame candles are permitted' },
  { id: 'confetti_sparklers',   category: 'Décor', label: 'Check confetti, sparkler, and fireworks policy' },
  { id: 'hanging_decor',        category: 'Décor', label: 'Ask about hanging décor / ceiling rigging restrictions' },
  { id: 'flower_petals',        category: 'Décor', label: 'Ask if real flower petals are allowed on the aisle' },

  // Guest Experience
  { id: 'headcount_deadline',   category: 'Guest Experience', label: 'Ask when the final headcount is due' },
  { id: 'max_capacity',         category: 'Guest Experience', label: 'Verify max capacity for both ceremony and reception layouts' },
  { id: 'coat_check',           category: 'Guest Experience', label: 'Ask if coat check / bag storage is available' },

  // Day-of
  { id: 'exclusive_use',        category: 'Day-of', label: 'Confirm exclusive use — no other events on your date' },
  { id: 'venue_contact',        category: 'Day-of', label: 'Get a dedicated day-of venue contact name & direct number' },
  { id: 'pre_event_tour',       category: 'Day-of', label: 'Schedule a final walkthrough 4–6 weeks before the date' },
]

const CATEGORIES = [...new Set(VENUE_CHECKLIST.map((i) => i.category))]

function toggle(checked: string[], id: string): string[] {
  return checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]
}

interface Props {
  checked: string[]
  onChange: (checked: string[]) => void
}

export function VenueChecklist({ checked, onChange }: Props) {
  const total = VENUE_CHECKLIST.length
  const done = checked.length
  const pct = Math.round((done / total) * 100)

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{done} / {total} items checked</p>
          <p className="text-xs text-gray-400 mt-0.5">Due diligence questions to ask before signing</p>
        </div>
        {done > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-rose-400 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Categories */}
      {CATEGORIES.map((cat) => {
        const items = VENUE_CHECKLIST.filter((i) => i.category === cat)
        const catDone = items.filter((i) => checked.includes(i.id)).length
        const allDone = catDone === items.length

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{cat}</h4>
              {allDone && (
                <span className="text-xs text-rose-500 font-medium">All done</span>
              )}
              {!allDone && catDone > 0 && (
                <span className="text-xs text-gray-300">{catDone}/{items.length}</span>
              )}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const isChecked = checked.includes(item.id)
                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors select-none',
                      isChecked ? 'bg-rose-50' : 'hover:bg-gray-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onChange(toggle(checked, item.id))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400 cursor-pointer flex-shrink-0"
                    />
                    <span className={cn(
                      'text-sm leading-snug',
                      isChecked ? 'text-gray-400 line-through' : 'text-gray-700',
                    )}>
                      {item.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
