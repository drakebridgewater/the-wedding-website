import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate,
  useDeleteEmailTemplate, usePreviewEmailTemplate, useSendEmailTemplate,
  useSentEmails, useParties,
} from './api'
import type { EmailTemplate, Party } from './types'

// ── Tiptap editor ─────────────────────────────────────────────────────────────

type InputMode = null | 'link' | 'image'

function Sep() {
  return <div className="w-px h-4 bg-stone-300 mx-0.5 self-center shrink-0" />
}

function TBtn({
  onClick, active, title, children,
}: {
  onClick: () => void
  active?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded ${active ? 'bg-stone-800 text-white' : 'hover:bg-stone-200 text-stone-600'}`}
    >
      {children}
    </button>
  )
}

function RichEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (html: string) => void
}) {
  const [inputMode, setInputMode] = useState<InputMode>(null)
  const [inputUrl, setInputUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write your email body here…' }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Sync when template switches
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus URL input when panel opens
  useEffect(() => {
    if (inputMode) setTimeout(() => inputRef.current?.focus(), 0)
  }, [inputMode])

  const insertMergeTag = useCallback((tag: string) => {
    editor?.chain().focus().insertContent(tag).run()
  }, [editor])

  const openLinkInput = () => {
    const existing = editor?.getAttributes('link').href ?? ''
    setInputUrl(existing)
    setInputMode('link')
  }

  const commitLink = () => {
    if (inputUrl) {
      editor?.chain().focus().setLink({ href: inputUrl }).run()
    } else {
      editor?.chain().focus().unsetLink().run()
    }
    setInputMode(null)
    setInputUrl('')
  }

  const commitImage = () => {
    if (inputUrl) editor?.chain().focus().setImage({ src: inputUrl }).run()
    setInputMode(null)
    setInputUrl('')
  }

  const cancelInput = () => { setInputMode(null); setInputUrl('') }

  const MERGE_TAGS = [
    { label: '{{party_name}}', tip: 'e.g. "The Smith Family"' },
    { label: '{{first_name}}', tip: "First guest's first name" },
    { label: '{{rsvp_link}}',  tip: 'Full RSVP URL' },
    { label: '{{couple}}',     tip: 'Bride & Groom names' },
  ]

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      {/* Toolbar row 1 — formatting */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-stone-50 border-b border-stone-200 flex-wrap">
        <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={14} />
        </TBtn>
        <Sep />
        <TBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
          <UnderlineIcon size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough">
          <Strikethrough size={14} />
        </TBtn>
        <Sep />
        <TBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
          <List size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Blockquote">
          <Quote size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus size={14} />
        </TBtn>
        <Sep />
        <TBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} title="Align left">
          <AlignLeft size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="Align center">
          <AlignCenter size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="Align right">
          <AlignRight size={14} />
        </TBtn>
        <Sep />
        <TBtn onClick={openLinkInput} active={editor?.isActive('link')} title="Insert link">
          <LinkIcon size={14} />
        </TBtn>
        <TBtn onClick={() => { setInputUrl(''); setInputMode('image') }} title="Insert image">
          <ImageIcon size={14} />
        </TBtn>
      </div>

      {/* URL input panel (link or image) */}
      {inputMode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-stone-100 border-b border-stone-200">
          <span className="text-xs text-stone-500 shrink-0">
            {inputMode === 'link' ? 'Link URL:' : 'Image URL:'}
          </span>
          <input
            ref={inputRef}
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') inputMode === 'link' ? commitLink() : commitImage()
              if (e.key === 'Escape') cancelInput()
            }}
            placeholder={inputMode === 'link' ? 'https://example.com' : 'https://example.com/photo.jpg'}
            className="flex-1 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
          <button
            type="button"
            onClick={inputMode === 'link' ? commitLink : commitImage}
            className="px-2 py-1 text-xs bg-stone-800 text-white rounded hover:bg-stone-700"
          >
            Insert
          </button>
          <button type="button" onClick={cancelInput} className="px-2 py-1 text-xs text-stone-500 hover:text-stone-700">
            Cancel
          </button>
        </div>
      )}

      {/* Merge tag row */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-stone-50 border-b border-stone-200 flex-wrap">
        <span className="text-xs text-stone-400 mr-1">Insert:</span>
        {MERGE_TAGS.map(({ label, tip }) => (
          <button
            key={label}
            type="button"
            title={tip}
            onClick={() => insertMergeTag(label)}
            className="px-2 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-mono"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-stone-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded"
      />
    </div>
  )
}

// ── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  subject,
  bodyHtml,
  onClose,
}: {
  subject: string
  bodyHtml: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">Preview (dummy data)</p>
            <p className="text-sm font-medium text-stone-800 mt-0.5">{subject}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
        </div>
        <div
          className="p-5 overflow-y-auto prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </div>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <p className="text-sm text-stone-700 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Template editor panel ─────────────────────────────────────────────────────

function TemplateEditor({
  template,
  onSaved,
  onDeleted,
}: {
  template: EmailTemplate | null
  onSaved: (t: EmailTemplate) => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(template?.body_html ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateTemplate = useUpdateEmailTemplate()
  const createTemplate = useCreateEmailTemplate()
  const deleteTemplate = useDeleteEmailTemplate()
  const previewMutation = usePreviewEmailTemplate()
  const [previewData, setPreviewData] = useState<{ subject: string; body_html: string } | null>(null)

  // Sync fields when template changes
  useEffect(() => {
    setName(template?.name ?? '')
    setSubject(template?.subject ?? '')
    setBodyHtml(template?.body_html ?? '')
  }, [template?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const data = { name, subject, body_html: bodyHtml }
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
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Template name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Invitation, Save the Date"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Subject line</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="You're invited!"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Email body</label>
          <RichEditor content={bodyHtml} onChange={setBodyHtml} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !name || !subject}
            className="px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : template ? 'Save changes' : 'Create template'}
          </button>
          <button
            onClick={handlePreview}
            disabled={!template || previewMutation.isPending}
            className="px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40"
          >
            Preview
          </button>
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
        <ConfirmModal
          message={`Delete template "${template?.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

// ── Send panel ────────────────────────────────────────────────────────────────

function SendPanel({ template }: { template: EmailTemplate | null }) {
  const { data: parties = [] } = useParties()
  const sendMutation = useSendEmailTemplate()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmSend, setConfirmSend] = useState(false)

  const invitedParties = parties.filter((p) => p.status === 'invited')

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectAllInvited = () =>
    setSelected(new Set(invitedParties.map((p) => p.id)))

  const clearAll = () => setSelected(new Set())

  const handleSend = () => {
    if (!template || selected.size === 0) return
    sendMutation.mutate(
      { templateId: template.id, partyIds: Array.from(selected) },
      {
        onSuccess: ({ sent, errors }) => {
          toast.success(`Sent to ${sent} ${sent === 1 ? 'party' : 'parties'}`)
          if (errors.length) toast.error(`${errors.length} error(s): ${errors[0]}`)
          setSelected(new Set())
          setConfirmSend(false)
        },
        onError: () => { toast.error('Send failed'); setConfirmSend(false) },
      }
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-700">Send to parties</h3>
          <div className="flex gap-2">
            <button onClick={selectAllInvited} className="text-xs text-indigo-600 hover:underline">
              All invited ({invitedParties.length})
            </button>
            <button onClick={clearAll} className="text-xs text-stone-400 hover:underline">Clear</button>
          </div>
        </div>

        {/* Party checklist */}
        <div className="border border-stone-200 rounded-lg overflow-y-auto max-h-72 divide-y divide-stone-100">
          {parties.length === 0 && (
            <p className="text-sm text-stone-400 p-3">No parties yet.</p>
          )}
          {parties.map((party) => (
            <PartyCheckRow
              key={party.id}
              party={party}
              checked={selected.has(party.id)}
              onToggle={() => toggle(party.id)}
            />
          ))}
        </div>

        <button
          disabled={!template || selected.size === 0 || sendMutation.isPending}
          onClick={() => setConfirmSend(true)}
          className="w-full py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
        >
          {sendMutation.isPending ? 'Sending…' : `Send to ${selected.size} ${selected.size === 1 ? 'party' : 'parties'}`}
        </button>
      </div>

      {confirmSend && (
        <ConfirmModal
          message={`Send "${template?.name}" to ${selected.size} ${selected.size === 1 ? 'party' : 'parties'}? This will deliver real emails.`}
          onConfirm={handleSend}
          onCancel={() => setConfirmSend(false)}
        />
      )}
    </>
  )
}

function PartyCheckRow({ party, checked, onToggle }: { party: Party; checked: boolean; onToggle: () => void }) {
  const guestCount = party.guests.length
  const hasSent = !!party.invitation_sent

  return (
    <label className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onToggle} className="rounded border-stone-300" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-stone-800 truncate block">{party.name}</span>
        <span className="text-xs text-stone-400">
          {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
          {hasSent && (
            <span className="ml-2 text-emerald-600">✓ sent {format(new Date(party.invitation_sent!), 'MMM d')}</span>
          )}
        </span>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        party.status === 'invited' ? 'bg-emerald-100 text-emerald-700' :
        party.status === 'planned' ? 'bg-amber-100 text-amber-700' :
        'bg-stone-100 text-stone-400'
      }`}>
        {party.status}
      </span>
    </label>
  )
}

// ── Send log ──────────────────────────────────────────────────────────────────

function SendLog() {
  const { data: log = [], isLoading } = useSentEmails()
  const [expanded, setExpanded] = useState<number | null>(null)
  const toggleRef = useRef<number | null>(null)

  return (
    <div>
      <h3 className="text-sm font-medium text-stone-700 mb-3">Send log</h3>
      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}
      {!isLoading && log.length === 0 && (
        <p className="text-sm text-stone-400">No emails sent yet.</p>
      )}
      <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100">
        {log.map((entry) => (
          <div key={entry.id}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 text-left"
              onClick={() => {
                toggleRef.current = entry.id
                setExpanded((prev) => prev === entry.id ? null : entry.id)
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-800 truncate">{entry.subject}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {entry.party_name ?? '—'} · {entry.template_name ?? 'no template'} · {entry.recipients.length} recipient(s)
                </p>
              </div>
              <span className="text-xs text-stone-400 shrink-0">
                {format(new Date(entry.sent_at), 'MMM d, h:mm a')}
              </span>
              <span className="text-stone-400 text-xs">{expanded === entry.id ? '▲' : '▼'}</span>
            </button>
            {expanded === entry.id && (
              <div className="px-4 py-3 bg-stone-50 border-t border-stone-100">
                <p className="text-xs text-stone-500 mb-2">To: {entry.recipients.join(', ')}</p>
                <div
                  className="prose prose-sm max-w-none text-stone-700"
                  dangerouslySetInnerHTML={{ __html: entry.body_html }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: parties = [] } = useParties()
  const { data: log = [] } = useSentEmails()

  const invited = parties.filter((p) => p.status === 'invited').length
  const sent = parties.filter((p) => p.invitation_sent).length
  const opened = parties.filter((p) => p.invitation_opened).length
  const responded = parties.filter((p) => p.rsvp_responded_at).length

  const stats = [
    { label: 'Invited', value: invited },
    { label: 'Emails sent', value: log.length },
    { label: 'Invite sent', value: sent },
    { label: 'Opened', value: opened },
    { label: 'RSVP\'d', value: responded },
  ]

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-stone-800">{value}</p>
          <p className="text-xs text-stone-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function EmailsTab() {
  const { data: templates = [], isLoading } = useEmailTemplates()
  const [activeId, setActiveId] = useState<number | 'new' | null>(null)

  // Auto-select first template on load
  useEffect(() => {
    if (templates.length > 0 && activeId === null) {
      setActiveId(templates[0].id)
    }
  }, [templates]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeTemplate = activeId === 'new' ? null : (templates.find((t) => t.id === activeId) ?? null)

  return (
    <div className="space-y-6">
      <StatsBar />

      {/* Template selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-stone-500 mr-1">Templates:</span>
        {isLoading && <span className="text-xs text-stone-400">Loading…</span>}
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              activeId === t.id
                ? 'bg-stone-800 text-white border-stone-800'
                : 'border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={() => setActiveId('new')}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            activeId === 'new'
              ? 'bg-stone-800 text-white border-stone-800'
              : 'border-dashed border-stone-300 text-stone-500 hover:bg-stone-50'
          }`}
        >
          + New template
        </button>
      </div>

      {/* Editor + send side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-stone-700 mb-3">
            {activeId === 'new' ? 'New template' : activeTemplate ? `Edit: ${activeTemplate.name}` : 'Select a template'}
          </h3>
          {(activeId === 'new' || activeTemplate) ? (
            <TemplateEditor
              key={activeId}
              template={activeTemplate}
              onSaved={(t) => setActiveId(t.id)}
              onDeleted={() => setActiveId(templates.filter((t) => t.id !== activeId)[0]?.id ?? 'new')}
            />
          ) : (
            <p className="text-sm text-stone-400">Select a template from the list above or create a new one.</p>
          )}
        </div>

        <div>
          <SendPanel template={activeTemplate} />
        </div>
      </div>

      {/* Send log */}
      <SendLog />
    </div>
  )
}
