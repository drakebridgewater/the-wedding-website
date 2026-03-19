import { X } from 'lucide-react'
import type { AnyVendor, VendorType } from './types'
import { VENDOR_LABELS } from './types'
import { useCreateVendor, useUpdateVendor, useDeleteVendor } from './api'
import { VendorForm } from './VendorForm'
import { PhotoUpload } from './PhotoUpload'
import { LocationMap } from './LocationMap'

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
  const isVenue = vendorType === 'venue'
  const isPending = createMutation.isPending || updateMutation.isPending

  const lat = vendor?.latitude ? parseFloat(vendor.latitude) : null
  const lng = vendor?.longitude ? parseFloat(vendor.longitude) : null
  const hasLocation = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)

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
    <div className="fixed inset-0 z-[1040] flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? vendor!.name : `Add ${VENDOR_LABELS[vendorType]}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* For venues: photos + map live inside the form's own tabs.
              For other vendor types: show them here above the form. */}
          {!isVenue && isEdit && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Photos</h3>
              <PhotoUpload
                vendorId={vendor!.id}
                vendorType={vendorType}
                photos={vendor!.photos}
              />
            </div>
          )}

          {!isVenue && isEdit && hasLocation && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</h3>
              <LocationMap lat={lat!} lng={lng!} />
            </div>
          )}

          {/* Form — for venues this includes all tabs internally */}
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
