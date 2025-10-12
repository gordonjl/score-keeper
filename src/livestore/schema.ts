import {
  Events,
  Schema,
  SessionIdSymbol,
  State,
  makeSchema,
} from '@livestore/livestore'
import {
  createSquashMaterializers,
  squashEvents,
  squashTables,
} from './squash-schema'

// ============================================================================
// TODO SCHEMA (Canary - will be removed after migration)
// ============================================================================

const todoTables = {
  todos: State.SQLite.table({
    name: 'todos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      text: State.SQLite.text({ default: '' }),
      completed: State.SQLite.boolean({ default: false }),
      deletedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
    },
  }),
  // Client documents can be used for local-only state (e.g. form inputs)
  uiState: State.SQLite.clientDocument({
    name: 'uiState',
    schema: Schema.Struct({
      newTodoText: Schema.String,
      filter: Schema.Literal('all', 'active', 'completed'),
    }),
    default: { id: SessionIdSymbol, value: { newTodoText: '', filter: 'all' } },
  }),
}

const todoEvents = {
  todoCreated: Events.synced({
    name: 'v1.TodoCreated',
    schema: Schema.Struct({ id: Schema.String, text: Schema.String }),
  }),
  todoCompleted: Events.synced({
    name: 'v1.TodoCompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoUncompleted: Events.synced({
    name: 'v1.TodoUncompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoDeleted: Events.synced({
    name: 'v1.TodoDeleted',
    schema: Schema.Struct({ id: Schema.String, deletedAt: Schema.Date }),
  }),
  todoClearedCompleted: Events.synced({
    name: 'v1.TodoClearedCompleted',
    schema: Schema.Struct({ deletedAt: Schema.Date }),
  }),
  uiStateSet: todoTables.uiState.set,
}

const todoMaterializers = {
  'v1.TodoCreated': ({ id, text }: { id: string; text: string }) =>
    todoTables.todos.insert({ id, text, completed: false }),
  'v1.TodoCompleted': ({ id }: { id: string }) =>
    todoTables.todos.update({ completed: true }).where({ id }),
  'v1.TodoUncompleted': ({ id }: { id: string }) =>
    todoTables.todos.update({ completed: false }).where({ id }),
  'v1.TodoDeleted': ({ id, deletedAt }: { id: string; deletedAt: Date }) =>
    todoTables.todos.update({ deletedAt }).where({ id }),
  'v1.TodoClearedCompleted': ({ deletedAt }: { deletedAt: Date }) =>
    todoTables.todos.update({ deletedAt }).where({ completed: true }),
}

// ============================================================================
// COMPOSED SCHEMA (TODO + Squash)
// ============================================================================

// Combine all tables
export const tables = {
  ...todoTables,
  ...squashTables,
}

// Combine all events
export const events = {
  ...todoEvents,
  ...squashEvents,
}

// Combine all materializers
const materializers = State.SQLite.materializers(events, {
  ...todoMaterializers,
  ...createSquashMaterializers(),
})

// Create final state and schema
const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
