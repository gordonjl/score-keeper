import { useStore } from '@livestore/react'
import { useState } from 'react'

/**
 * Development-only component to reset the LiveStore database
 * Useful when browser and Cloudflare Durable Objects get out of sync
 */
export const DevStoreReset = () => {
  const { store } = useStore()
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development
  if (!import.meta.env.DEV) return null

  const handleHardReset = async () => {
    const confirmed = window.confirm(
      '⚠️ This will DELETE ALL DATA for this store!\n\n' +
        `StoreId: ${store.storeId}\n\n` +
        'This will:\n' +
        '- Clear the browser SQLite database\n' +
        '- Clear the eventlog\n' +
        '- Require a page reload\n\n' +
        'The Cloudflare sync backend will NOT be cleared.\n\n' +
        'Continue?',
    )

    if (!confirmed) return

    try {
      // Access the dev helper
      // @ts-expect-error - dev helper not in types
      await window.__debugLiveStore[store.storeId]._dev.hardReset()

      // Reload the page
      window.location.reload()
    } catch (error) {
      console.error('Failed to reset store:', error)
      alert('Failed to reset store. Check console for details.')
    }
  }

  const handleDownloadDb = () => {
    try {
      // @ts-expect-error - dev helper not in types
      window.__debugLiveStore[store.storeId]._dev.downloadDb()
    } catch (error) {
      console.error('Failed to download database:', error)
    }
  }

  const handleDownloadEventlog = () => {
    try {
      // @ts-expect-error - dev helper not in types
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      window.__debugLiveStore[store.storeId]._dev.downloadEventlogDb()
    } catch (error) {
      console.error('Failed to download eventlog:', error)
    }
  }

  const handleCheckSyncState = () => {
    try {
      // @ts-expect-error - dev helper not in types
      const syncStates =
        window.__debugLiveStore[store.storeId]._dev.syncStates()
      console.log('Sync States:', syncStates)
      alert('Sync states logged to console')
    } catch (error) {
      console.error('Failed to get sync states:', error)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-warning text-warning-content p-4 rounded-lg shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">
              🛠️ Dev Tools - Store: {store.storeId}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-xs btn-ghost"
              aria-label="Close dev tools"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCheckSyncState}
              className="btn btn-sm btn-ghost"
            >
              📊 Check Sync State
            </button>
            <button
              type="button"
              onClick={handleDownloadDb}
              className="btn btn-sm btn-ghost"
            >
              💾 Download DB
            </button>
            <button
              type="button"
              onClick={handleDownloadEventlog}
              className="btn btn-sm btn-ghost"
            >
              📜 Download Eventlog
            </button>
            <button
              type="button"
              onClick={() => void handleHardReset()}
              className="btn btn-sm btn-error"
            >
              🗑️ Hard Reset
            </button>
          </div>
          <div className="text-xs mt-2 opacity-70">
            Tip: Open console for detailed info
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn btn-sm btn-circle bg-warning text-warning-content hover:bg-warning/80 shadow-lg"
          aria-label="Open dev tools"
          title="Dev Tools"
        >
          🛠️
        </button>
      )}
    </div>
  )
}
