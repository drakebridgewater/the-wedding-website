import { Modal } from './Modal'
import { Button } from './Button'
import { useEnterSubmit } from '../hooks/useEnterSubmit'

export function ConfirmDialog({
  title = 'Are you sure?', message, confirmLabel = 'Delete', danger = true,
  onConfirm, onClose,
}: {
  title?: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  function confirm() { onConfirm(); onClose() }
  useEnterSubmit(confirm)

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-stone-600">{message}</p>
    </Modal>
  )
}
