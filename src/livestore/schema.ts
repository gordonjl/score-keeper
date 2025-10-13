import { State, makeSchema } from '@livestore/livestore'
import { squashEvents, todoEvents } from './events'
import { createMaterializers } from './materializers'
import { squashTables, todoTables, uiTables } from './tables'

// ============================================================================
// COMPOSED SCHEMA (TODO + Squash + UI)
// ============================================================================

// Combine all tables
export const tables = {
  ...todoTables,
  ...squashTables,
  ...uiTables,
}

// Combine all events
export const events = {
  ...todoEvents,
  uiStateSet: todoTables.uiState.set,
  ...squashEvents,
  gameUiStateSet: squashTables.gameUiState.set,
  // UI state events
  modalStateSet: uiTables.modalState.set,
  nextGameSetupStateSet: uiTables.nextGameSetupState.set,
  themePreferenceSet: uiTables.themePreference.set,
}

// Create materializers
const materializers = createMaterializers()

// Create final state and schema
const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
