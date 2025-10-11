import { useStore } from '@livestore/react'
import { createContext, useContext, useEffect } from 'react'
import { useMachine } from '@xstate/react'
import { events } from '../livestore/schema'
import { matchById$ } from '../livestore/squash-queries'
import { matchMachine } from '../machines/matchMachine'
import type { MatchId } from '../db/types'
import type { ActorRefFrom } from 'xstate'

// Context type - just provides the actor and matchId
type LiveStoreMatchContextType = {
  readonly actor: ActorRefFrom<typeof matchMachine> | null
  readonly matchId: MatchId
  readonly isLoading: boolean
}

const LiveStoreMatchContext = createContext<LiveStoreMatchContextType | null>(
  null,
)

// Hook to use the context
export const useLiveStoreMatch = () => {
  const context = useContext(LiveStoreMatchContext)
  if (!context) {
    throw new Error(
      'useLiveStoreMatch must be used within LiveStoreMatchProvider',
    )
  }
  return context
}

// Provider props
type LiveStoreMatchProviderProps = {
  readonly matchId: MatchId
  readonly children: React.ReactNode
}

// Simple provider - just provides matchId and UI state machine
export const LiveStoreMatchProvider = ({
  matchId,
  children,
}: LiveStoreMatchProviderProps) => {
  const { store } = useStore()
  
  // Query match data to check if loaded
  const match = store.useQuery(matchById$(matchId))
  
  // Create the UI state machine
  const [, , actor] = useMachine(matchMachine, {
    input: { matchId, currentGameId: null },
  })

  // Simple initialization: just mark as loaded when match data arrives
  useEffect(() => {
    if (match && actor.getSnapshot().value === 'loading') {
      actor.send({ type: 'MATCH_LOADED' })
    }
  }, [match, actor])

  const isLoading = !match

  return (
    <LiveStoreMatchContext.Provider value={{ actor, matchId, isLoading }}>
      {children}
    </LiveStoreMatchContext.Provider>
  )
}

// Hook to create a new match
export const useCreateLiveStoreMatch = () => {
  const { store } = useStore()

  const createMatch = (playerNames: ReadonlyArray<string>) => {
    const matchId = crypto.randomUUID() as MatchId

    // Commit match creation event
    store.commit(
      events.matchCreated({
        matchId,
        playerNames: [...playerNames],
        timestamp: new Date(),
      }),
    )

    return matchId
  }

  return { createMatch }
}
