import { useState } from 'react'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { TextField } from '../components/FormField'
import { useEnterSubmit } from '../hooks/useEnterSubmit'

/** Name-only party creation — full details live in the PartyEditor drawer. */
export function AddPartyModal({
  onSave, onClose, saving,
}: {
  onSave: (name: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [name, setName] = useState('')

  function doSave() {
    if (!name.trim()) return
    onSave(name.trim())
  }

  useEnterSubmit(doSave, !name.trim() || saving)

  return (
    <Modal
      title="Add Party"
      onClose={onClose}
      size="xs"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim() || saving} onClick={doSave}>
            {saving ? 'Creating…' : 'Create & edit →'}
          </Button>
        </>
      }
    >
      <TextField
        label="Party name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Smith Family"
        autoFocus
        hint="You can fill in the rest once the party is created."
      />
    </Modal>
  )
}
