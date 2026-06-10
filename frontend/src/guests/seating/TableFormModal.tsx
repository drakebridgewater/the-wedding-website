import { useState } from 'react'
import type { SeatingTable, TableFormData } from '../types'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { SelectField, TextAreaField, TextField } from '../components/FormField'
import { useEnterSubmit } from '../hooks/useEnterSubmit'

export function TableFormModal({
  initial, onSave, onClose, saving,
}: {
  initial?: SeatingTable
  onSave: (data: TableFormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<TableFormData>({
    name:     initial?.name     ?? '',
    capacity: initial?.capacity ?? 8,
    shape:    initial?.shape    ?? 'round',
    notes:    initial?.notes    ?? '',
  })

  function set<K extends keyof TableFormData>(k: K, v: TableFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  useEnterSubmit(() => onSave(form), !form.name || saving)

  return (
    <Modal
      title={initial ? 'Edit Table' : 'Add Table'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!form.name || saving} onClick={() => form.name && onSave(form)}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add table'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField
          label="Table name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Table 1, Head Table, Family Table"
          autoFocus
        />
        <TextField
          label="Capacity"
          type="number"
          min={1}
          max={200}
          value={form.capacity}
          onChange={(e) => set('capacity', parseInt(e.target.value, 10) || 8)}
        />
        <SelectField
          label="Shape"
          value={form.shape}
          onChange={(e) => set('shape', e.target.value as 'round' | 'square')}
          options={[['round', 'Round'], ['square', 'Square / Rectangular']]}
        />
        <TextAreaField
          label="Notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="Special notes about this table…"
        />
      </div>
    </Modal>
  )
}
