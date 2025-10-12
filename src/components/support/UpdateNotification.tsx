import { useState } from 'react'
import { useVersionCheck } from '../../hooks/useVersionCheck'

export const UpdateNotification = () => {
  const [dismissed, setDismissed] = useState(false)
  const { hasUpdate, reload } = useVersionCheck(60_000) // Check every 60 seconds

  const handleUpdate = () => {
    reload()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  if (!hasUpdate || dismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="rounded-lg bg-white p-4 shadow-lg border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-2">
              New version available!
            </p>
            <p className="text-xs text-gray-600 mb-3">
              A new version of the app is ready. Reload to get the latest
              features and fixes.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                Reload
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
