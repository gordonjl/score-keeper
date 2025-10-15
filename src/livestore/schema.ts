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

// Combine all events
export const events = {
  ...todoEvents,
  uiStateSet: todoTables.uiState.set,
  ...squashEvents,
  gameUiStateSet: squashTables.gameUiState.set,
  ...authEvents,
  currentUserSet: authTables.currentUser.set,
  ...playerEvents,
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
