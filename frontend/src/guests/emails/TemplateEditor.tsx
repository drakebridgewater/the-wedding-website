import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  useCreateEmailTemplate, useDeleteEmailTemplate, usePreviewEmailTemplate,
  useRemoveEmailTemplateImage, useUpdateEmailTemplate, useUploadEmailTemplateImage,
} from '../api'
import type { EmailTemplate } from '../types'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Field, TextAreaField, TextField } from '../components/FormField'
import { RichEditor } from './RichEditor'

function PreviewModal({
  subject, bodyHtml, onClose,
}: {
  subject: string
  bodyHtml: string
  onClose: () => void
}) {
  return (
    <Modal
      size="2xl"
      onClose={onClose}
      title={
        <span>
          <span className="block text-xs text-stone-400 uppercase tracking-wide font-normal">Preview (dummy data)</span>
          {subject}
        </span>
      }
    >
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </Modal>
  )
}

/** Create / edit one email template (name, subject, image, body, footer). */
export function TemplateEditor({
  template, onSaved, onDeleted,
}: {
  template: EmailTemplate | null
  onSaved: (t: EmailTemplate) => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(template?.body_html ?? '')
  const [footerHtml, setFooterHtml] = useState(template?.footer_html ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const updateTemplate = useUpdateEmailTemplate()
  const createTemplate = useCreateEmailTemplate()
  const deleteTemplate = useDeleteEmailTemplate()
  const previewMutation = usePreviewEmailTemplate()
  const uploadImage = useUploadEmailTemplateImage()
  const removeImage = useRemoveEmailTemplateImage()
  const [previewData, setPreviewData] = useState<{ subject: string; body_html: string } | null>(null)

  // Sync fields when template changes
  useEffect(() => {
    setName(template?.name ?? '')
    setSubject(template?.subject ?? '')
    setBodyHtml(template?.body_html ?? '')
    setFooterHtml(template?.footer_html ?? '')
  }, [template?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !template) return
    uploadImage.mutate({ id: template.id, file }, {
      onSuccess: (updated) => { toast.success('Image uploaded'); onSaved(updated) },
      onError: () => toast.error('Image upload failed'),
    })
    e.target.value = ''
  }

  const handleRemoveImage = () => {
    if (!template) return
    removeImage.mutate(template.id, {
      onSuccess: (updated) => { toast.success('Image removed'); onSaved(updated) },
      onError: () => toast.error('Failed to remove image'),
    })
  }

  const handleSave = () => {
    const data = { name, subject, body_html: bodyHtml, footer_html: footerHtml }
    if (template) {
      updateTemplate.mutate({ id: template.id, data }, {
        onSuccess: (updated) => { toast.success('Template saved'); onSaved(updated) },
        onError: () => toast.error('Failed to save template'),
      })
    } else {
      createTemplate.mutate(data, {
        onSuccess: (created) => { toast.success('Template created'); onSaved(created) },
        onError: () => toast.error('Failed to create template'),
      })
    }
  }

  const handlePreview = () => {
    if (!template) {
      toast.error('Save the template first to preview it')
      return
    }
    previewMutation.mutate(template.id, {
      onSuccess: (data) => setPreviewData(data),
      onError: () => toast.error('Preview failed'),
    })
  }

  const handleDelete = () => {
    if (!template) return
    deleteTemplate.mutate(template.id, {
      onSuccess: () => { toast.success('Template deleted'); onDeleted() },
      onError: () => toast.error('Failed to delete template'),
    })
  }

  const isSaving = updateTemplate.isPending || createTemplate.isPending

  return (
    <>
      <div className="space-y-3">
        <TextField
          label="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Invitation, Save the Date"
        />
        <TextField
          label="Subject line"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="You're invited!"
        />
        <Field
          label={<>Header image <span className="font-normal text-stone-400">(optional)</span></>}
          hint={!template ? 'Save the template first to upload an image.' : undefined}
        >
          {template?.image_url ? (
            <div className="flex items-start gap-3">
              <img src={template.image_url} alt="Template image" className="h-24 w-24 object-cover rounded-lg border border-stone-200" />
              <div className="flex flex-col gap-2 mt-1">
                <Button size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploadImage.isPending}>
                  Replace
                </Button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={removeImage.isPending}
                  className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => template && imageInputRef.current?.click()}
              disabled={!template || uploadImage.isPending}
              className="px-3 py-2 text-sm border border-dashed border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 text-stone-500"
            >
              {uploadImage.isPending ? 'Uploading…' : '+ Upload image'}
            </button>
          )}
        </Field>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <Field label="Email body">
          <RichEditor content={bodyHtml} onChange={setBodyHtml} />
        </Field>
        <TextAreaField
          label={<>Footer <span className="font-normal text-stone-400">(leave blank for default)</span></>}
          value={footerHtml}
          onChange={(e) => setFooterHtml(e.target.value)}
          placeholder="e.g. Can't make it? Let us know at rsvp@example.com"
          rows={3}
          className="resize-y font-mono"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !name || !subject}>
            {isSaving ? 'Saving…' : template ? 'Save changes' : 'Create template'}
          </Button>
          <Button variant="secondary" onClick={handlePreview} disabled={!template || previewMutation.isPending}>
            Preview
          </Button>
          {template && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="ml-auto px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {previewData && (
        <PreviewModal
          subject={previewData.subject}
          bodyHtml={previewData.body_html}
          onClose={() => setPreviewData(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete template"
          message={`Delete template "${template?.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
