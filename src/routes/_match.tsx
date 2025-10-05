import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MatchMachineContext } from '../contexts/MatchMachineContext'
import { ACTIVE_MATCH_KEY } from '../utils/matchPersistence'

export const Route = createFileRoute('/_match')({
  component: MatchLayout,
})

const MatchContent = () => {
  const actorRef = MatchMachineContext.useActorRef()

  // Subscribe to state changes and persist to localStorage
  useEffect(() => {
    const subscription = actorRef.subscribe(() => {
      const persistedState = actorRef.getPersistedSnapshot()
      try {
        localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(persistedState))
      } catch (error) {
        console.error('Failed to persist match state:', error)
      }
    })

    return () => subscription.unsubscribe()
  }, [actorRef])

  return <Outlet />
}

function MatchLayout() {
  // Use state to defer localStorage read until after hydration
  const [restoredSnapshot, setRestoredSnapshot] = useState<any>(undefined)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Only run on client after hydration
    setIsClient(true)
    try {
      const persistedState = localStorage.getItem(ACTIVE_MATCH_KEY)
      if (persistedState) {
        setRestoredSnapshot(JSON.parse(persistedState))
      }
    } catch (error) {
      console.error('Failed to restore match state:', error)
    }
  }, [])

  // Don't render provider until we've checked for persisted state
  if (!isClient) {
    return null
  }

  return (
    <MatchMachineContext.Provider
      options={restoredSnapshot ? { snapshot: restoredSnapshot } : undefined}
    >
      <MatchContent />
    </MatchMachineContext.Provider>
  )
}
