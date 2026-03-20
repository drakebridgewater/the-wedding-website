import { X } from 'lucide-react'
import type { AnyVendor, VendorType } from './types'
import { VENDOR_LABELS } from './types'
import { useCreateVendor, useUpdateVendor, useDeleteVendor } from './api'
import { VendorForm } from './VendorForm'

interface Props {
  vendorType: VendorType
  vendor: AnyVendor | null
  onClose: () => void
}

export function VendorModal({ vendorType, vendor, onClose }: Props) {
  const createMutation = useCreateVendor(vendorType)
  const updateMutation = useUpdateVendor(vendorType)
  const deleteMutation = useDeleteVendor(vendorType)

  const isEdit = vendor !== null
  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(data: Partial<AnyVendor>) {
    if (isEdit) {
      updateMutation.mutate(
        { id: vendor!.id, data },
        { onSuccess: onClose },
      )
    } else {
      createMutation.mutate(data, { onSuccess: onClose })
    }
  }

  function handleDelete() {
    if (!vendor) return
    if (!confirm(`Delete "${vendor.name}"? This cannot be undone.`)) return
    deleteMutation.mutate(vendor.id, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-[1040] flex items-start justify-center bg-black/40 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? vendor!.name : `Add ${VENDOR_LABELS[vendorType]}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5">
          <VendorForm
            vendorType={vendorType}
            vendor={vendor}
            onSubmit={handleSubmit}
            onDelete={isEdit ? handleDelete : undefined}
            isPending={isPending || deleteMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
