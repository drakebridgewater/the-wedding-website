import { useState } from 'react'
import type { AnyVendor, VendorType } from './types'
import { VENDOR_LABELS } from './types'
import { useVendors } from './api'
import { VendorGrid } from './VendorGrid'
import { VendorModal } from './VendorModal'
import { cn } from '@/lib/utils'

const VENDOR_TABS: VendorType[] = ['venue', 'caterer', 'cake', 'florist', 'entertainment']

const VENDOR_TAB_ICONS: Record<VendorType, string> = {
  venue: '🏛️',
  caterer: '🍽️',
  cake: '🎂',
  florist: '💐',
  entertainment: '🎵',
}

interface TabContentProps {
  vendorType: VendorType
}

function TabContent({ vendorType }: TabContentProps) {
  const { data: vendors, isLoading, error } = useVendors(vendorType)
  const [selectedVendor, setSelectedVendor] = useState<AnyVendor | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function openEdit(vendor: AnyVendor) {
    setSelectedVendor(vendor)
    setModalOpen(true)
  }

  function openCreate() {
    setSelectedVendor(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedVendor(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24 text-red-500">
        <p>Failed to load vendors. Please refresh the page.</p>
      </div>
    )
  }

  return (
    <>
      <VendorGrid
        vendors={vendors ?? []}
        vendorType={vendorType}
        onSelectVendor={openEdit}
        onAddVendor={openCreate}
      />
      {modalOpen && (
        <VendorModal
          vendorType={vendorType}
          vendor={selectedVendor}
          onClose={closeModal}
        />
      )}
    </>
  )
}

interface Props {
  vendorType: VendorType
}

export function VendorsApp({ vendorType }: Props) {
  const [activeTab, setActiveTab] = useState<VendorType>(vendorType)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-8 overflow-x-auto">
        {VENDOR_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
            )}
          >
            <span>{VENDOR_TAB_ICONS[tab]}</span>
            {VENDOR_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Active tab content — key resets state on tab switch */}
      <TabContent key={activeTab} vendorType={activeTab} />
    </div>
  )
}
