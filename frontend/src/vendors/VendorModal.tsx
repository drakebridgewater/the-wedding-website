import { ExternalLink, Printer, X } from 'lucide-react'
import type { AnyVendor, VendorType } from './types'
import { VENDOR_LABELS } from './types'
import { useCreateVendor, useUpdateVendor, useDeleteVendor, useChecklistItems } from './api'
import { VendorForm } from './VendorForm'
import { VendorPrintSheet } from './VendorPrintSheet'

interface Props {
  vendorType: VendorType
  vendor: AnyVendor | null
  onClose: () => void
}

export function VendorModal({ vendorType, vendor, onClose }: Props) {
  const createMutation = useCreateVendor(vendorType)
  const updateMutation = useUpdateVendor(vendorType)
  const deleteMutation = useDeleteVendor(vendorType)
  const { data: checklistItems = [] } = useChecklistItems(vendorType)

  const isEdit = vendor !== null
  const isPending = createMutation.isPending || updateMutation.isPending

  function handlePrint() {
    document.body.classList.add('vendor-print-mode')
    window.print()
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('vendor-print-mode')
    }, { once: true })
  }

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
          <div className="flex items-center gap-1">
            {isEdit && vendor?.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                title="Visit website"
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink size={18} />
              </a>
            )}
            {isEdit && (
              <button
                onClick={handlePrint}
                title="Print visit sheet / Export PDF"
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Printer size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
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

      {isEdit && (
        <div className="px-8 py-6">
          <VendorPrintSheet
            vendor={vendor!}
            vendorType={vendorType}
            checklistItems={checklistItems}
          />
        </div>
      )}
    </div>
  )
}
