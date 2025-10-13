import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider } from '@livestore/react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import LiveStoreWorker from '../../livestore/livestore.worker?worker'
import { schema } from '../../livestore/schema'

// Generate a store ID for this browser/user
// For testing: Use a fixed storeId so all browsers sync to the same store
// In production: Each user should have their own storeId (e.g., based on user ID)
const getStoreId = () => {
  if (typeof window === 'undefined') return 'ssr-placeholder'

  // Fixed storeId for testing cross-browser sync
  // TODO: In production, use user-specific ID like: `user-${userId}`
  return 'test-store-shared'

  // Original code for unique per-browser storeId:
  // const key = 'livestore-store-id'
  // let storeId = localStorage.getItem(key)
  // if (!storeId) {
  //   storeId = crypto.randomUUID()
  //   localStorage.setItem(key, storeId)
  // }
  // return storeId
}

// Initialize adapter once on client side (singleton pattern)
let adapterInstance: ReturnType<typeof makePersistedAdapter> | null = null
let storeIdInstance: string | null = null

const getAdapter = () => {
  if (typeof window === 'undefined') return null

  adapterInstance ??= makePersistedAdapter({
    storage: { type: 'opfs' }, // Origin Private File System for persistence
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker, // For cross-tab sync
  })

  return adapterInstance
}

const getOrCreateStoreId = () => {
  if (typeof window === 'undefined') return 'ssr-placeholder'

  storeIdInstance ??= getStoreId()

  return storeIdInstance
}

type LiveStoreProviderWrapperProps = {
  children: React.ReactNode
}

export const LiveStoreProviderWrapper = ({
  children,
}: LiveStoreProviderWrapperProps) => {
  const adapter = getAdapter()
  const storeId = getOrCreateStoreId()

  // Don't render LiveStore on server
  if (typeof window === 'undefined' || !adapter) {
    return <>{children}</>
  }

  return (
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      renderLoading={(state) => (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">Loading LiveStore ({state.stage})...</p>
          </div>
        </div>
      )}
      batchUpdates={batchUpdates}
      storeId={storeId}
      syncPayload={{ authToken: 'insecure-token-change-me' }}
    >
      {children}
    </LiveStoreProvider>
  )
}
