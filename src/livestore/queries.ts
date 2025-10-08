import { queryDb } from '@livestore/livestore'
import { tables } from './schema'

// Query for UI state (client-only)
export const uiState$ = queryDb(
  () => tables.uiState.get(),
  { label: 'uiState' },
)

// Query for all active todos
export const activeTodos$ = queryDb(
  () =>
    tables.todos.where({
      deletedAt: null,
      completed: false,
    }),
  { label: 'activeTodos' },
)

// Query for all completed todos
export const completedTodos$ = queryDb(
  () =>
    tables.todos.where({
      deletedAt: null,
      completed: true,
    }),
  { label: 'completedTodos' },
)

// Query for all visible todos based on filter
export const visibleTodos$ = queryDb(
  (get) => {
    const { filter } = get(uiState$)
    return tables.todos.where({
      deletedAt: null,
      completed: filter === 'all' ? undefined : filter === 'completed',
    })
  },
  { label: 'visibleTodos' },
)
