export type Priority = 0 | 1 | 3 | 5   // none / low / medium / high
export type TaskStatus = 0 | 2           // active / completed

export interface TickTickTask {
  id: string
  title: string
  content: string
  priority: Priority
  status: TaskStatus
  due_date: string | null
  start_date: string | null
  assignee: string | null
  tags: string[]
  created_time: string | null
  modified_time: string | null
}

export type SortBy = 'due' | 'priority' | 'created'
export type StatusFilter = 'active' | 'completed' | 'all'

export interface TodoFilters {
  assignee: string       // '' = all
  status: StatusFilter
  sort: SortBy
}

export interface CreateTaskData {
  title: string
  content?: string
  due_date?: string      // ISO date string YYYY-MM-DD
  priority?: Priority
  assignee?: string
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  0: 'None',
  1: 'Low',
  3: 'Medium',
  5: 'High',
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  0: 'bg-gray-300',
  1: 'bg-blue-400',
  3: 'bg-orange-400',
  5: 'bg-red-500',
}
