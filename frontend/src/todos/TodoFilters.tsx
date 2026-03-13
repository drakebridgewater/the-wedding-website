import type { StatusFilter, SortBy, TodoFilters } from './types'

interface Props {
  filters: TodoFilters
  onChange: (f: TodoFilters) => void
  drakeEmail: string
  shawnaEmail: string
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

export function TodoFilters({ filters, onChange, drakeEmail, shawnaEmail }: Props) {
  const set = (patch: Partial<TodoFilters>) => onChange({ ...filters, ...patch })

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4 py-3">
      {/* Assignee */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Assignee:</span>
        <div className="flex gap-1">
          <PillButton active={filters.assignee === ''} onClick={() => set({ assignee: '' })}>
            All
          </PillButton>
          {drakeEmail && (
            <PillButton active={filters.assignee === drakeEmail} onClick={() => set({ assignee: drakeEmail })}>
              Drake
            </PillButton>
          )}
          {shawnaEmail && (
            <PillButton active={filters.assignee === shawnaEmail} onClick={() => set({ assignee: shawnaEmail })}>
              Shawna
            </PillButton>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Show:</span>
        <div className="flex gap-1">
          {statusOptions.map(({ value, label }) => (
            <PillButton key={value} active={filters.status === value} onClick={() => set({ status: value })}>
              {label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-gray-500 font-medium">Sort:</span>
        <select
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as SortBy })}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="due">Due Date</option>
          <option value="priority">Priority</option>
          <option value="created">Created</option>
        </select>
      </div>
    </div>
  )
}
