/**
 * Debug component to clear all browser storage including OPFS
 * Remove this in production or hide behind a dev flag
 */
export const ClearStorageButton = () => {
  const clearAllStorage = async () => {
    try {
      // Clear OPFS (where LiveStore SQLite database lives)
      if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        const root = await navigator.storage.getDirectory()
        // @ts-expect-error - values() exists but TypeScript types may be outdated
        for await (const entry of root.values()) {
          try {
            await root.removeEntry(entry.name, { recursive: true })
            console.log(`✅ Removed OPFS entry: ${entry.name}`)
          } catch (err) {
            // Some entries may be protected or locked, skip them
            console.warn(`⚠️ Could not remove OPFS entry: ${entry.name}`, err)
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
      alert(`Error clearing storage: ${error}`)
    }
  }

  return (
    <button
      onClick={clearAllStorage}
      className="btn btn-error btn-sm"
      type="button"
    >
      🗑️ Clear All Storage (Dev)
    </button>
  )
}
