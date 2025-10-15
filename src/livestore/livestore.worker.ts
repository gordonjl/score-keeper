import { makeWorker } from '@livestore/adapter-web/worker'
import { makeCfSync } from '@livestore/sync-cf'

import { schema } from './schema'

const syncUrl = import.meta.env.VITE_LIVESTORE_SYNC_URL as string | undefined

makeWorker({
  schema,
  sync: syncUrl
    ? {
        backend: makeCfSync({ url: syncUrl }),
        // Skip initial sync to avoid blocking - sync happens in background
        initialSyncOptions: { _tag: 'Skip' },
        // Don't crash on sync errors - continue as if offline
        onSyncError: 'ignore',
      }
    : undefined,
})
