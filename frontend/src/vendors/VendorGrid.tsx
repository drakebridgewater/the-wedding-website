import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, List, Plus, Settings, ClipboardList, X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnyVendor, VendorType } from './types'
import { VENDOR_LABELS, getCardFieldDefs, DEFAULT_VISIBLE_FIELDS } from './types'
import { VendorCard } from './VendorCard'

// ---- Per-type descriptions ----

const VENDOR_DESCRIPTIONS: Record<VendorType, string> = {
  venue:         'Compare ceremony and reception spaces — capacity, style, cost, and must-ask questions.',
  caterer:       'Track catering options, price per head, menu notes, and tasting status.',
  cake:          'Shortlist bakeries, flavors, and pricing per tier. Keep tasting notes handy.',
  florist:       'Compare florists by arrangement type, pricing, and aesthetic.',
  entertainment: 'Compare DJs, bands, and other entertainment with package details and pricing.',
}

// ---- Allergy Report Modal ----

interface GuestRestriction {
  name: string
  restriction: string
}

function AllergyReportModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<GuestRestriction[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/guests/api/parties/')
      .then((r) => r.json())
      .then((parties: Array<{ guests: Array<{ first_name: string; last_name: string; dietary_restrictions: string }> }>) => {
        const results: GuestRestriction[] = []
        for (const party of parties) {
          for (const g of party.guests) {
            if (g.dietary_restrictions?.trim()) {
              results.push({
                name: `${g.first_name} ${g.last_name}`.trim(),
                restriction: g.dietary_restrictions.trim(),
              })
            }
          }
        }
        setData(results)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleCopy() {
    const text = data.length === 0
      ? 'No dietary restrictions reported.'
      : data.map((d) => `${d.name}: ${d.restriction}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Dietary Restrictions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Share with your caterer</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-gray-500">No dietary restrictions have been reported by guests.</p>
          ) : (
            <ul className="space-y-2">
              {data.map((d, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-medium text-gray-800 min-w-[120px]">{d.name}</span>
                  <span className="text-gray-600">{d.restriction}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {!loading && `${data.length} guest${data.length !== 1 ? 's' : ''} with restrictions`}
          </span>
          <button
            onClick={handleCopy}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy list'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [allergyOpen, setAllergyOpen] = useState(false)
  const [visibleFields, setVisibleFields] = useState<Set<string>>(() => loadVisibleFields(vendorType))
  const sorted = sortVendors(vendors)

  function handleFieldChange(fields: Set<string>) {
    setVisibleFields(fields)
    saveVisibleFields(vendorType, fields)
  }

  return (
    <div className="space-y-4">
      {allergyOpen && <AllergyReportModal onClose={() => setAllergyOpen(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{VENDOR_LABELS[vendorType]}</h1>
          <p className="text-sm text-gray-500 mt-1">{VENDOR_DESCRIPTIONS[vendorType]}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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

          {vendorType === 'caterer' && (
            <button
              onClick={() => setAllergyOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="View guest dietary restrictions"
            >
              <ClipboardList size={16} />
              <span className="hidden sm:inline">Allergies</span>
            </button>
          )}

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
