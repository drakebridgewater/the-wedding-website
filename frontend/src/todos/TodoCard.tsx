import { format, isPast, parseISO } from 'date-fns'
import { CheckCircle2, Circle } from 'lucide-react'
import { useCompleteTodo } from './api'
import { PRIORITY_COLOR, PRIORITY_LABEL, type TickTickTask } from './types'

interface Props {
  task: TickTickTask
}

export function TodoCard({ task }: Props) {
  const complete = useCompleteTodo()
  const isOverdue =
    task.due_date && task.status === 0 && isPast(parseISO(task.due_date))

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      {/* Complete button */}
      <button
        onClick={() => complete.mutate(task.id)}
        disabled={complete.isPending}
        className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-500 transition-colors disabled:opacity-50"
        aria-label="Mark complete"
      >
        {complete.isPending ? (
          <CheckCircle2 size={20} className="text-green-400" />
        ) : (
          <Circle size={20} />
        )}
      </button>

      {/* Priority dot */}
      <span
        className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLOR[task.priority]}`}
        title={`Priority: ${PRIORITY_LABEL[task.priority]}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-gray-900 ${task.status === 2 ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </p>
        {task.content && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{task.content}</p>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.tags.map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right side: due date + assignee */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-sm">
        {task.due_date && (
          <span className={`${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
        {task.assignee && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase">
            {task.assignee[0]}
          </span>
        )}
      </div>
    </div>
  )
}
