import { ClientOnly, Outlet, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
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

const MatchProviderClient = () => {
  // This only runs on the client after hydration
  const getRestoredSnapshot = () => {
    try {
      const persistedState = localStorage.getItem(ACTIVE_MATCH_KEY)
      if (persistedState) {
        return JSON.parse(persistedState)
      }
    } catch (error) {
      console.error('Failed to restore match state:', error)
    }
    return undefined
  }

  const restoredSnapshot = getRestoredSnapshot()

  return (
    <MatchMachineContext.Provider
      options={restoredSnapshot ? { snapshot: restoredSnapshot } : undefined}
    >
      <MatchContent />
    </MatchMachineContext.Provider>
  )
}

function MatchLayout() {
  return (
    <ClientOnly fallback={null}>
      <MatchProviderClient />
    </ClientOnly>
  )
}
