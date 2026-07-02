import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  useCreateEmailTemplate, useDeleteEmailTemplate, useParties, usePreviewEmailTemplate,
  useRemoveEmailTemplateImage, useTestSendEmailTemplate, useUpdateEmailTemplate, useUploadEmailTemplateImage,
} from '../api'
import type { EmailPreview, EmailTemplate, EmailTemplateDraft, EmailTemplateFormData, EmailTemplatePurpose, Party } from '../types'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CheckboxField, Field, SelectField, TextField } from '../components/FormField'
import { RichEditor } from './RichEditor'

const PURPOSE_OPTIONS: [EmailTemplatePurpose, string][] = [
  ['save_the_date', 'Save the Date'],
  ['invitation', 'Invitation'],
  ['other', 'Something else (thank-you, reminder…)'],
]

const TEST_EMAIL_STORAGE_KEY = 'emailTestAddress'

/** Hex color picker with a matching text input. */
function ColorField({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 rounded border border-stone-300 cursor-pointer p-0.5 bg-white"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>
    </Field>
  )
}

function PartySelect({
  parties, partyId, onChange,
}: {
  parties: Party[]
  partyId: number | null
  onChange: (id: number | null) => void
}) {
  return (
    <select
      value={partyId ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
    >
      <option value="">Sample data (The Smith Family)</option>
      {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )
}

function PreviewModal({
  preview, parties, partyId, onPartyChange, loading, onClose,
}: {
  preview: EmailPreview
  parties: Party[]
  partyId: number | null
  onPartyChange: (id: number | null) => void
  loading: boolean
  onClose: () => void
}) {
  return (
    <Modal
      size="2xl"
      onClose={onClose}
      title={
        <span>
          <span className="block text-xs text-stone-400 uppercase tracking-wide font-normal">
            Exact email preview — subject:
          </span>
          {preview.subject}
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-stone-600 shrink-0">Preview as</label>
          <PartySelect parties={parties} partyId={partyId} onChange={onPartyChange} />
          {loading && <span className="text-xs text-stone-400">Rendering…</span>}
        </div>
        <iframe
          title="Email preview"
          srcDoc={preview.html}
          sandbox=""
          className="w-full h-[65vh] border border-stone-200 rounded-lg bg-white"
        />
      </div>
    </Modal>
  )
}

function TestSendModal({
  parties, onSend, sending, onClose,
}: {
  parties: Party[]
  onSend: (email: string, partyId: number | null) => void
  sending: boolean
  onClose: () => void
}) {
  const [email, setEmail] = useState(() => localStorage.getItem(TEST_EMAIL_STORAGE_KEY) ?? '')
  const [partyId, setPartyId] = useState<number | null>(null)

  return (
    <Modal
      size="md"
      onClose={onClose}
      title="Email me a test"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!email.includes('@') || sending}
            onClick={() => onSend(email.trim(), partyId)}
          >
            {sending ? 'Sending…' : 'Send test'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-stone-500">
          Sends this email (with your latest edits) to just you, so you can see
          it in a real inbox. It won't be logged and no guests will see it.
        </p>
        <TextField
          label="Your email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label="Fill in details as"
          hint="Pick a real party if you want the RSVP button in the test to actually work."
        >
          <PartySelect parties={parties} partyId={partyId} onChange={setPartyId} />
        </Field>
      </div>
    </Modal>
  )
}

/** Create / edit one email template (name, purpose, subject, image, button, colors, body, footer). */
export function TemplateEditor({
  template, onSaved, onDeleted,
}: {
  template: EmailTemplate | null
  onSaved: (t: EmailTemplate) => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [purpose, setPurpose] = useState<EmailTemplatePurpose>(template?.purpose ?? 'other')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(template?.body_html ?? '')
  const [footerHtml, setFooterHtml] = useState(template?.footer_html ?? '')
  const [showRsvpButton, setShowRsvpButton] = useState(template?.show_rsvp_button ?? true)
  const [rsvpButtonText, setRsvpButtonText] = useState(template?.rsvp_button_text ?? 'View Invitation')
  const [rsvpButtonColor, setRsvpButtonColor] = useState(template?.rsvp_button_color ?? '#337ab7')
  const [backgroundColor, setBackgroundColor] = useState(template?.background_color ?? '#fff3e8')
  const [fontColor, setFontColor] = useState(template?.font_color ?? '#666666')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [testSendOpen, setTestSendOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const updateTemplate = useUpdateEmailTemplate()
  const createTemplate = useCreateEmailTemplate()
  const deleteTemplate = useDeleteEmailTemplate()
  const previewMutation = usePreviewEmailTemplate()
  const testSendMutation = useTestSendEmailTemplate()
  const uploadImage = useUploadEmailTemplateImage()
  const removeImage = useRemoveEmailTemplateImage()
  const { data: parties = [] } = useParties()
  const [previewData, setPreviewData] = useState<EmailPreview | null>(null)
  const [previewPartyId, setPreviewPartyId] = useState<number | null>(null)

  // Sync fields when template changes
  useEffect(() => {
    setName(template?.name ?? '')
    setPurpose(template?.purpose ?? 'other')
    setSubject(template?.subject ?? '')
    setBodyHtml(template?.body_html ?? '')
    setFooterHtml(template?.footer_html ?? '')
    setShowRsvpButton(template?.show_rsvp_button ?? true)
    setRsvpButtonText(template?.rsvp_button_text ?? 'View Invitation')
    setRsvpButtonColor(template?.rsvp_button_color ?? '#337ab7')
    setBackgroundColor(template?.background_color ?? '#fff3e8')
    setFontColor(template?.font_color ?? '#666666')
  }, [template?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const draft: EmailTemplateDraft = {
    subject,
    body_html: bodyHtml,
    footer_html: footerHtml,
    show_rsvp_button: showRsvpButton,
    rsvp_button_text: rsvpButtonText,
    rsvp_button_color: rsvpButtonColor,
    background_color: backgroundColor,
    font_color: fontColor,
  }
  const formData: EmailTemplateFormData = { ...draft, name, purpose }

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
    if (template) {
      updateTemplate.mutate({ id: template.id, data: formData }, {
        onSuccess: (updated) => { toast.success('Template saved'); onSaved(updated) },
        onError: () => toast.error('Failed to save template'),
      })
    } else {
      createTemplate.mutate(formData, {
        onSuccess: (created) => { toast.success('Template created'); onSaved(created) },
        onError: () => toast.error('Failed to create template'),
      })
    }
  }

  const runPreview = (partyId: number | null) => {
    if (!template) return
    previewMutation.mutate({ id: template.id, partyId: partyId ?? undefined, draft }, {
      onSuccess: (data) => setPreviewData(data),
      onError: () => toast.error('Preview failed'),
    })
  }

  const handlePreview = () => {
    if (!template) {
      toast.error('Save the template first to preview it')
      return
    }
    runPreview(previewPartyId)
  }

  const handlePreviewPartyChange = (partyId: number | null) => {
    setPreviewPartyId(partyId)
    runPreview(partyId)
  }

  const handleTestSend = (email: string, partyId: number | null) => {
    if (!template) return
    localStorage.setItem(TEST_EMAIL_STORAGE_KEY, email)
    testSendMutation.mutate({ id: template.id, email, partyId: partyId ?? undefined, draft }, {
      onSuccess: ({ sent_to }) => {
        toast.success(`Test email sent to ${sent_to}`)
        setTestSendOpen(false)
      },
      onError: () => toast.error('Test send failed — check the address and try again'),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Invitation, Save the Date"
          />
          <SelectField
            label="What kind of email is this?"
            hint="Sending a Save the Date or Invitation automatically checks that party off the matching list."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as EmailTemplatePurpose)}
            options={PURPOSE_OPTIONS}
          />
        </div>
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

        <div className="border border-stone-200 rounded-lg p-3 space-y-3">
          <CheckboxField
            label="Show RSVP button at the top"
            checked={showRsvpButton}
            onChange={(e) => setShowRsvpButton(e.target.checked)}
          />
          {showRsvpButton && (
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <TextField
                  label="Button text"
                  value={rsvpButtonText}
                  onChange={(e) => setRsvpButtonText(e.target.value)}
                  placeholder="View Invitation"
                />
              </div>
              <ColorField label="Button color" value={rsvpButtonColor} onChange={setRsvpButtonColor} />
            </div>
          )}
          <div className="flex items-end gap-4 flex-wrap">
            <ColorField label="Background" value={backgroundColor} onChange={setBackgroundColor} />
            <ColorField label="Text color" value={fontColor} onChange={setFontColor} />
          </div>
        </div>

        <Field
          label="Email body"
          hint="The body is centered on a colored card in the final email, as shown here."
        >
          <RichEditor content={bodyHtml} onChange={setBodyHtml} backgroundColor={backgroundColor} fontColor={fontColor} />
        </Field>
        <Field label={<>Footer <span className="font-normal text-stone-400">(leave blank for the standard RSVP note)</span></>}>
          <RichEditor
            content={footerHtml}
            onChange={setFooterHtml}
            variant="compact"
            placeholder="e.g. Can't make it? Just reply to this email and let us know."
          />
        </Field>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !name || !subject}>
            {isSaving ? 'Saving…' : template ? 'Save changes' : 'Create template'}
          </Button>
          <Button variant="secondary" onClick={handlePreview} disabled={!template || previewMutation.isPending}>
            {previewMutation.isPending ? 'Rendering…' : 'Preview'}
          </Button>
          <Button variant="secondary" onClick={() => setTestSendOpen(true)} disabled={!template}>
            Email me a test
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
        {!template && (
          <p className="text-xs text-stone-400">Preview and test sends unlock once the template is created.</p>
        )}
      </div>

      {previewData && (
        <PreviewModal
          preview={previewData}
          parties={parties}
          partyId={previewPartyId}
          onPartyChange={handlePreviewPartyChange}
          loading={previewMutation.isPending}
          onClose={() => setPreviewData(null)}
        />
      )}

      {testSendOpen && (
        <TestSendModal
          parties={parties}
          onSend={handleTestSend}
          sending={testSendMutation.isPending}
          onClose={() => setTestSendOpen(false)}
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
