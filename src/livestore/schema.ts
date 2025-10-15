import { State, makeSchema } from '@livestore/livestore'
import { authEvents, playerEvents, squashEvents, todoEvents } from './events'
import { createMaterializers } from './materializers'
import {
  authTables,
  playerTables,
  squashTables,
  todoTables,
  uiTables,
} from './tables'

// ============================================================================
// COMPOSED SCHEMA (TODO + Squash + Auth + Players + UI)
// ============================================================================

// Combine all tables
export const tables = {
  ...todoTables,
  ...squashTables,
  ...authTables,
  ...playerTables,
  ...uiTables,
}

// Combine all synced events
// NOTE: clientDocument.set events (like currentUserSet, uiStateSet, etc.) should
// NOT be included here. They are automatically handled as client-only by LiveStore
// and are NOT synced to the server. They're available via table.set property.
export const events = {
  ...todoEvents,
  ...squashEvents,
  ...authEvents,
  ...playerEvents,
}

// Create materializers
const materializers = createMaterializers()

// Create final state and schema
const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
