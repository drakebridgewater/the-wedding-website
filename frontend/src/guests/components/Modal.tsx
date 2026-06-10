import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg' | '2xl'

const SIZES: Record<Size, string> = {
  xs:  'sm:max-w-xs',
  sm:  'sm:max-w-sm',
  md:  'sm:max-w-md',
  lg:  'sm:max-w-lg',
  '2xl': 'sm:max-w-2xl',
}

/**
 * Shared modal shell. Renders as a bottom sheet on phones and a centered
 * dialog from `sm:` up. Body scrolls; header/footer stay pinned.
 */
export function Modal({
  title, onClose, children, footer, size = 'sm',
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: Size
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn(
          'bg-white shadow-2xl w-full flex flex-col max-h-[92dvh]',
          'rounded-t-2xl sm:rounded-xl sm:mx-4',
          SIZES[size],
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-stone-900 truncate">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-600 p-1 -m-1 flex-shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-stone-200 flex justify-end gap-2 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
