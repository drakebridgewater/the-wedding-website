import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-stone-800 text-white hover:bg-stone-700',
  secondary: 'border border-stone-300 text-stone-600 hover:bg-stone-50',
  danger:    'bg-rose-600 text-white hover:bg-rose-700',
  ghost:     'text-stone-500 hover:bg-stone-100 hover:text-stone-700',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({
  variant = 'secondary', size = 'md', className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant], SIZES[size], className,
      )}
    >
      {children}
    </button>
  )
}

/**
 * Small icon-only action button (edit / delete / toggle in rows).
 * Keeps a ≥36px hit area on touch devices while staying visually compact.
 */
export function IconButton({
  title, danger = false, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      {...rest}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center justify-center rounded p-2 min-w-9 min-h-9 transition-colors',
        danger
          ? 'text-stone-400 hover:bg-rose-50 hover:text-rose-500'
          : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600',
        className,
      )}
    >
      {children}
    </button>
  )
}
