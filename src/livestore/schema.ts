import { State, makeSchema } from '@livestore/livestore'
import {
  createSquashMaterializers,
  squashEvents,
  squashTables,
} from './squash-schema'

// Export squash tables and events directly
export const tables = squashTables
export const events = squashEvents

// Create materializers and state
const materializers = State.SQLite.materializers(events, {
  ...createSquashMaterializers(),
})

const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
