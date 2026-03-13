import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Toaster } from 'sonner'
import { useTodos } from './api'
import { TodoCard } from './TodoCard'
import { TodoFilters } from './TodoFilters'
import { CreateTaskModal } from './CreateTaskModal'
import type { TodoFilters as Filters } from './types'

interface Props {
  drakeEmail: string
  shawnaEmail: string
}

export function TodosApp({ drakeEmail, shawnaEmail }: Props) {
  const [filters, setFilters] = useState<Filters>({
    assignee: '',
    status: 'active',
    sort: 'due',
  })
  const [modalOpen, setModalOpen] = useState(false)

  const { data: tasks, isLoading, isError, error } = useTodos(filters)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wedding To-Dos</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* Filters */}
      <TodoFilters
        filters={filters}
        onChange={setFilters}
        drakeEmail={drakeEmail}
        shawnaEmail={shawnaEmail}
      />

      {/* Task list */}
      <div className="mt-4 space-y-2">
        {isLoading && (
          <p className="text-center text-gray-500 py-12">Loading tasks from TickTick…</p>
        )}
        {isError && (
          <div className="text-center text-red-500 py-12">
            <p className="font-medium">Failed to load tasks</p>
            <p className="text-sm mt-1">{(error as Error).message}</p>
          </div>
        )}
        {!isLoading && !isError && tasks?.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            {filters.status === 'active' ? 'No active tasks — nice work! 🎉' : 'No tasks found.'}
          </p>
        )}
        {tasks?.map((task) => (
          <TodoCard key={task.id} task={task} />
        ))}
      </div>

      <CreateTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        drakeEmail={drakeEmail}
        shawnaEmail={shawnaEmail}
      />
    </div>
  )
}
