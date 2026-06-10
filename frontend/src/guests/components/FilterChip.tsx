export function FilterChip({
  label, count, active, onClick, outline = false,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
  outline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-stone-800 text-white'
          : outline
            ? 'border border-stone-300 text-stone-600 hover:border-stone-400 hover:text-stone-800'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  )
}
