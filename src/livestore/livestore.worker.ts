import { makeWorker } from '@livestore/adapter-web/worker'
import { makeCfSync } from '@livestore/sync-cf'

import { schema } from './schema'

const syncUrl = import.meta.env.VITE_LIVESTORE_SYNC_URL as string | undefined

makeWorker({
  schema,
  sync: syncUrl
    ? {
        backend: makeCfSync({ url: syncUrl }),
        // Use blocking sync with timeout instead of skipping entirely
        // This allows quick startup (3s) while still attempting to sync
        // If sync doesn't complete in 3s, it continues in the background
        initialSyncOptions: {
          _tag: 'Blocking',
          timeout: 3000, // 3 second timeout for initial sync
        },
        // Continue running despite sync errors (offline mode)
        // Note: Use __debugLiveStore.default._dev.syncStates() in console
        // to check sync status and diagnose issues
        onSyncError: 'ignore',
      }
    : undefined,
})
