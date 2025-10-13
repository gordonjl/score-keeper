// Type for OPFS directory entries
type OPFSEntry = { name: string }

/**
 * Debug component to clear all browser storage including OPFS
 * Remove this in production or hide behind a dev flag
 */
export const ClearStorageButton = () => {
  const clearAllStorage = async () => {
    try {
      // Clear OPFS (where LiveStore SQLite database lives)
      // Note: OPFS is only supported in Chromium-based browsers (Chrome 102+, Edge 102+)
      if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        const root = await navigator.storage.getDirectory()
        // Type assertion needed as TypeScript's OPFS types are incomplete
        // @ts-expect-error - values() exists but not in current TypeScript types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const entries = root.values() as AsyncIterableIterator<OPFSEntry>
        for await (const entry of entries) {
          try {
            await root.removeEntry(entry.name, { recursive: true })
            console.log(`✅ Removed OPFS entry: ${entry.name}`)
          } catch (err) {
            // Some entries may be protected or locked, skip them
            const errorName = err instanceof Error ? err.name : 'Unknown'
            console.warn(
              `⚠️ Could not remove OPFS entry: ${entry.name}`,
              errorName,
            )
          }
        }
        console.log('✅ OPFS cleared (some entries may be protected)')
      }

      // Clear IndexedDB
      const dbs = await indexedDB.databases()
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name)
        }
      }
      console.log('✅ IndexedDB cleared')

      // Clear localStorage
      localStorage.clear()
      console.log('✅ LocalStorage cleared')

      // Clear sessionStorage
      sessionStorage.clear()
      console.log('✅ SessionStorage cleared')

      alert('All storage cleared! Page will reload.')
      window.location.reload()
    } catch (error) {
      console.error('Error clearing storage:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      alert(`Error clearing storage: ${errorMessage}`)
    }
  }

  return (
    <button
      onClick={() => void clearAllStorage()}
      className="btn btn-error btn-sm"
      type="button"
    >
      🗑️ Clear All Storage (Dev)
    </button>
  )
}
