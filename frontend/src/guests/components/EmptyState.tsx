import type { ReactNode } from 'react'

export function EmptyState({
  message, hint, actionLabel, onAction,
}: {
  message: ReactNode
  hint?: ReactNode
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="text-center py-16 text-stone-400">
      <p className="text-sm">{message}</p>
      {hint && <p className="text-xs mt-1">{hint}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-3 text-sm text-rose-600 hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
