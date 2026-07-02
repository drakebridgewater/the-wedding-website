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
import { MERGE_TAGS, MergeTag, pillsToTokens, tokensToPills } from './mergeTag'

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
      className={`p-2 rounded ${active ? 'bg-stone-800 text-white' : 'hover:bg-stone-200 text-stone-600'}`}
    >
      {children}
    </button>
  )
}

/** Tiptap-based email body editor.
 *
 * Merge tokens ({{party_name}} etc.) display as friendly labeled pills but
 * are stored as raw tokens — `content` in and `onChange` out always use the
 * token form the backend expects.
 *
 * The editing area mirrors how the final email renders the body: centered
 * text in Helvetica on the template's background color. Pass the template's
 * colors so what you type matches what the guest receives.
 *
 * `variant="compact"` slims the toolbar down (bold / italic / link + merge
 * pills) for small fields like the footer.
 */
export function RichEditor({
  content, onChange, backgroundColor, fontColor, variant = 'full', placeholder,
}: {
  content: string
  onChange: (html: string) => void
  backgroundColor?: string
  fontColor?: string
  variant?: 'full' | 'compact'
  placeholder?: string
}) {
  const [inputMode, setInputMode] = useState<InputMode>(null)
  const [inputUrl, setInputUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const compact = variant === 'compact'

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Write your email body here…' }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      MergeTag,
    ],
    content: tokensToPills(content),
    onUpdate: ({ editor }) => onChange(pillsToTokens(editor.getHTML())),
  })

  // Sync when template switches
  useEffect(() => {
    if (editor && pillsToTokens(editor.getHTML()) !== content) {
      editor.commands.setContent(tokensToPills(content))
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus URL input when panel opens
  useEffect(() => {
    if (inputMode) setTimeout(() => inputRef.current?.focus(), 0)
  }, [inputMode])

  const insertMergeTag = useCallback((tag: string) => {
    editor?.chain().focus().insertContent({ type: 'mergeTag', attrs: { tag } }).run()
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

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      {/* Toolbar row 1 — formatting */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-stone-50 border-b border-stone-200 flex-wrap">
        {!compact && (
          <>
            <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
              <Heading1 size={14} />
            </TBtn>
            <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
              <Heading2 size={14} />
            </TBtn>
            <Sep />
          </>
        )}
        <TBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic size={14} />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
          <UnderlineIcon size={14} />
        </TBtn>
        {!compact && (
          <>
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
          </>
        )}
        <TBtn onClick={openLinkInput} active={editor?.isActive('link')} title="Insert link">
          <LinkIcon size={14} />
        </TBtn>
        {!compact && (
          <TBtn onClick={() => { setInputUrl(''); setInputMode('image') }} title="Insert image">
            <ImageIcon size={14} />
          </TBtn>
        )}
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
        <span className="text-xs text-stone-400 mr-1">Add a detail:</span>
        {MERGE_TAGS.map(({ tag, label, tip }) => (
          <button
            key={tag}
            type="button"
            title={tip}
            onClick={() => insertMergeTag(tag)}
            className="px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Editor area — styled like the email body card (centered, Helvetica, template colors) */}
      <EditorContent
        editor={editor}
        style={{
          backgroundColor: backgroundColor ?? (compact ? '#ffffff' : '#fff3e8'),
          color: fontColor ?? '#666666',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
        className={`prose prose-sm max-w-none p-3 ${compact ? 'min-h-[80px]' : 'min-h-[200px]'} text-center [&_.ProseMirror]:text-inherit [&_h1]:text-inherit [&_h2]:text-inherit [&_a]:text-inherit [&_.ProseMirror]:outline-none focus-within:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-stone-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:w-full [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded`}
      />
    </div>
  )
}
