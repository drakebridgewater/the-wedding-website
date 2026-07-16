import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy } from 'lucide-react'
import { useClickOutside } from '../hooks/useClickOutside'
import type { PartyLinks } from '../types'

const LINK_OPTIONS: { key: keyof PartyLinks; label: string; hint: string }[] = [
  { key: 'save_the_date', label: 'Save-the-Date card', hint: 'The animated card' },
  { key: 'rsvp', label: 'RSVP / invitation', hint: 'Invitation + RSVP form' },
  { key: 'details', label: 'Contact details form', hint: 'Address & name confirmation' },
]

const MENU_WIDTH = 200

/**
 * Copies one of a party's personal links to the clipboard, for texting.
 * Opening any of these links stamps the party's open receipt, so this is a
 * real send channel — not just a debugging shortcut.
 *
 * The menu is positioned fixed against the button's rect: its callers sit
 * inside scroll containers (the party table) that would otherwise clip it.
 */
export function CopyLinkMenu({ links, partyName }: { links: PartyLinks; partyName: string }) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const open = coords !== null

  useClickOutside([menuRef, buttonRef], () => setCoords(null), open)

  // The rect is captured on open, so any scroll or resize invalidates it.
  useEffect(() => {
    if (!open) return
    const close = () => setCoords(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // Callers put this inside a clickable row or a <label>; neither should react
  // to menu clicks.
  function isolate(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function toggle(e: React.MouseEvent) {
    isolate(e)
    if (open) return setCoords(null)
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setCoords({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    })
  }

  async function copy(e: React.MouseEvent, key: keyof PartyLinks, label: string) {
    isolate(e)
    const url = links?.[key]
    if (!url) {
      toast.error('No link available for this party')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success(`${label} link for ${partyName} copied`)
      setCoords(null)
    } catch {
      toast.error('Could not copy — clipboard access was blocked')
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title={`Copy a link to text to ${partyName}`}
        aria-label={`Copy a link for ${partyName}`}
        aria-expanded={open}
        className="p-2 -m-1 rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors"
      >
        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      </button>
      {open && (
        <div
          ref={menuRef}
          onClick={isolate}
          style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="fixed z-50 bg-white border border-stone-200 rounded-lg shadow-lg py-1 text-left"
        >
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-stone-400 truncate">
            Copy link for {partyName}
          </p>
          {LINK_OPTIONS.map(({ key, label, hint }) => (
            <button
              key={key}
              type="button"
              onClick={(e) => copy(e, key, label)}
              className="w-full text-left px-3 py-2 hover:bg-stone-50 transition-colors"
            >
              <span className="block text-xs text-stone-700">{label}</span>
              <span className="block text-[10px] text-stone-400">{hint}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
