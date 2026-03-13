import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, List, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnyVendor, VendorType } from './types'
import { VENDOR_LABELS, getCardFieldDefs, DEFAULT_VISIBLE_FIELDS } from './types'
import { VendorCard } from './VendorCard'

// ---- Persist visible fields in localStorage ----

function loadVisibleFields(vendorType: VendorType): Set<string> {
  try {
    const raw = localStorage.getItem(`vendorCardFields_${vendorType}`)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // ignore
  }
  return new Set(DEFAULT_VISIBLE_FIELDS)
}

function saveVisibleFields(vendorType: VendorType, fields: Set<string>) {
  localStorage.setItem(`vendorCardFields_${vendorType}`, JSON.stringify([...fields]))
}

// ---- Field settings popover ----

interface SettingsPopoverProps {
  vendorType: VendorType
  visibleFields: Set<string>
  onChange: (fields: Set<string>) => void
  onClose: () => void
}

function SettingsPopover({ vendorType, visibleFields, onChange, onClose }: SettingsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const fieldDefs = getCardFieldDefs(vendorType)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function toggle(key: string) {
    const next = new Set(visibleFields)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  function resetDefaults() {
    onChange(new Set(DEFAULT_VISIBLE_FIELDS))
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-[1050] bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-56"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">Card fields</span>
        <button onClick={resetDefaults} className="text-xs text-rose-500 hover:text-rose-700">
          Reset
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3">Name is always shown.</p>
      <div className="space-y-1.5">
        {fieldDefs.map((f) => (
          <label key={f.key} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={visibleFields.has(f.key)}
              onChange={() => toggle(f.key)}
              className="rounded text-rose-600 focus:ring-rose-400"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ---- Main component ----

interface Props {
  vendors: AnyVendor[]
  vendorType: VendorType
  onSelectVendor: (vendor: AnyVendor) => void
  onAddVendor: () => void
}

function sortVendors(vendors: AnyVendor[]): AnyVendor[] {
  return [...vendors].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1
    if (a.is_chosen !== b.is_chosen) return a.is_chosen ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function VendorGrid({ vendors, vendorType, onSelectVendor, onAddVendor }: Props) {
  const [listView, setListView] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [visibleFields, setVisibleFields] = useState<Set<string>>(() => loadVisibleFields(vendorType))
  const sorted = sortVendors(vendors)

  function handleFieldChange(fields: Set<string>) {
    setVisibleFields(fields)
    saveVisibleFields(vendorType, fields)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{VENDOR_LABELS[vendorType]}</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setListView(false)}
              className={cn(
                'p-2 transition-colors',
                !listView ? 'bg-rose-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600',
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setListView(true)}
              className={cn(
                'p-2 transition-colors',
                listView ? 'bg-rose-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600',
              )}
            >
              <List size={16} />
            </button>
          </div>

          {/* Field settings */}
          <div className="relative">
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              className={cn(
                'p-2 rounded-lg border border-gray-200 transition-colors',
                settingsOpen
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-white text-gray-400 hover:text-gray-600',
              )}
              title="Configure card fields"
            >
              <Settings size={16} />
            </button>
            {settingsOpen && (
              <SettingsPopover
                vendorType={vendorType}
                visibleFields={visibleFields}
                onChange={handleFieldChange}
                onClose={() => setSettingsOpen(false)}
              />
            )}
          </div>

          <button
            onClick={onAddVendor}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Grid / List */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-lg font-medium">No options yet</p>
          <p className="text-sm mt-1">Click "+ Add" to add your first option</p>
        </div>
      ) : listView ? (
        <div className="space-y-2">
          {sorted.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              vendorType={vendorType}
              visibleFields={visibleFields}
              onClick={() => onSelectVendor(v)}
              listView
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              vendorType={vendorType}
              visibleFields={visibleFields}
              onClick={() => onSelectVendor(v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
