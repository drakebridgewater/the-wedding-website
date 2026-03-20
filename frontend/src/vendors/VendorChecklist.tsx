import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { VendorType } from './types'

interface ChecklistItem {
  id: number
  vendor_type: string
  category: string
  text: string
  question: string
  order: number
}

async function fetchChecklistItems(vendorType: VendorType): Promise<ChecklistItem[]> {
  const res = await fetch(`/vendors/api/checklist-items/?vendor_type=${vendorType}`)
  if (!res.ok) throw new Error('Failed to load checklist items')
  return res.json()
}

function toggle(checked: number[], id: number): number[] {
  return checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]
}

interface Props {
  vendorType: VendorType
  checked: number[]
  onChange: (checked: number[]) => void
}

export function VendorChecklist({ vendorType, checked, onChange }: Props) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist-items', vendorType],
    queryFn: () => fetchChecklistItems(vendorType),
    staleTime: Infinity,
  })

  if (isLoading) {
    return <div className="text-sm text-gray-400 py-4">Loading checklist…</div>
  }

  if (items.length === 0) {
    return <div className="text-sm text-gray-400 py-4 italic">No checklist items yet.</div>
  }

  const categories = [...new Set(items.map((i) => i.category))]
  const total = items.length
  const done = checked.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{done} / {total} items checked</p>
          <p className="text-xs text-gray-400 mt-0.5">Questions to ask before signing</p>
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
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat)
        const catDone = catItems.filter((i) => checked.includes(i.id)).length
        const allDone = catDone === catItems.length

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{cat}</h4>
              {allDone && (
                <span className="text-xs text-rose-500 font-medium">All done</span>
              )}
              {!allDone && catDone > 0 && (
                <span className="text-xs text-gray-300">{catDone}/{catItems.length}</span>
              )}
            </div>
            <div className="space-y-0.5">
              {catItems.map((item) => {
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
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400 cursor-pointer flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={cn(
                        'text-sm font-medium leading-snug',
                        isChecked ? 'text-gray-400 line-through' : 'text-gray-800',
                      )}>
                        {item.text}
                      </p>
                      {item.question && (
                        <p className={cn(
                          'text-xs mt-0.5 leading-relaxed',
                          isChecked ? 'text-gray-300' : 'text-gray-500',
                        )}>
                          {item.question}
                        </p>
                      )}
                    </div>
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
