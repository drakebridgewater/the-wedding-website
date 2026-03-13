import { useState } from 'react'
import type { AnyVendor, VendorType } from './types'
import { useVendors } from './api'
import { VendorGrid } from './VendorGrid'
import { VendorModal } from './VendorModal'

interface Props {
  vendorType: VendorType
}

export function VendorsApp({ vendorType }: Props) {
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
    <div className="max-w-7xl mx-auto px-4 py-8">
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
    </div>
  )
}
