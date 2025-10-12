import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export const UpdateNotification = () => {
  const [showReload, setShowReload] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', registration)

      // Check for updates every 60 seconds
      if (registration) {
        setInterval(() => {
          registration.update()
        }, 60_000)
      }
    },
    onRegisterError(error: Error) {
      console.error('SW registration error', error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      setShowReload(true)
    }
  }, [needRefresh])

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
    setShowReload(false)
  }

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  if (!showReload && !offlineReady) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="rounded-lg bg-white p-4 shadow-lg border border-gray-200">
        {offlineReady ? (
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                App ready to work offline
              </p>
            </div>
            <button
              onClick={close}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        ) : (
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
                  onClick={close}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
