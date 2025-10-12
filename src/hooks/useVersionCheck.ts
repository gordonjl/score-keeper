import { useEffect, useState } from 'react'

type VersionInfo = {
  version: string
  timestamp: string
}

export const useVersionCheck = (checkInterval = 60_000) => {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json', {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })

        if (!response.ok) {
          console.warn('Failed to fetch version.json')
          return
        }

        const data: VersionInfo = await response.json()

        if (!currentVersion) {
          // First load - store the current version
          setCurrentVersion(data.version)
        } else if (data.version !== currentVersion) {
          // Version changed - notify user
          console.log(
            `New version available: ${data.version} (current: ${currentVersion})`,
          )
          setHasUpdate(true)
        }
      } catch (error) {
        console.error('Error checking version:', error)
      }
    }

    // Check immediately on mount
    void checkVersion()

    // Then check periodically
    const interval = setInterval(() => {
      void checkVersion()
    }, checkInterval)

    return () => clearInterval(interval)
  }, [currentVersion, checkInterval])

  const reload = () => {
    window.location.reload()
  }

  return { hasUpdate, reload }
}
