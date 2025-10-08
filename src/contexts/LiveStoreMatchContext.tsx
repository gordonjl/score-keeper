import { useStore } from '@livestore/react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { events } from '../livestore/schema'
import { gamesByMatch$, matchById$ } from '../livestore/squash-queries'
import { matchMachine } from '../machines/matchMachine'
import type { MatchId } from '../db/types'
import type { ActorRefFrom } from 'xstate'

// Context type
type LiveStoreMatchContextType = {
  readonly actor: ActorRefFrom<typeof matchMachine> | null
  readonly matchId: MatchId
  readonly isLoading: boolean
  readonly error: string | null
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

// Provider component
export const LiveStoreMatchProvider = ({
  matchId,
  children,
}: LiveStoreMatchProviderProps) => {
  const { store } = useStore()

  // Query match and games data from LiveStore
  const match = store.useQuery(matchById$(matchId))
  const games = store.useQuery(gamesByMatch$(matchId))

  // Use XState React hook to manage the machine
  const [, , actor] = useMachine(matchMachine, {
    input: { matchId, store },
  })

  // Restore match state from LiveStore when data is loaded
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!match || !games) return

    const snapshot = actor.getSnapshot()

    // Only restore if we're in idle state (haven't been set up yet)
    if (snapshot.value !== 'idle') return

    // If match is already set up in LiveStore, send SETUP_MATCH event
    if (match.playerA1FirstName) {
      actor.send({
        type: 'SETUP_MATCH',
        players: {
          A1: {
            firstName: match.playerA1FirstName,
            lastName: match.playerA1LastName,
            fullName: `${match.playerA1FirstName} ${match.playerA1LastName}`,
          },
          A2: {
            firstName: match.playerA2FirstName,
            lastName: match.playerA2LastName,
            fullName: `${match.playerA2FirstName} ${match.playerA2LastName}`,
          },
          B1: {
            firstName: match.playerB1FirstName,
            lastName: match.playerB1LastName,
            fullName: `${match.playerB1FirstName} ${match.playerB1LastName}`,
          },
          B2: {
            firstName: match.playerB2FirstName,
            lastName: match.playerB2LastName,
            fullName: `${match.playerB2FirstName} ${match.playerB2LastName}`,
          },
          teamA: `${match.playerA1FirstName} ${match.playerA1LastName} & ${match.playerA2FirstName} ${match.playerA2LastName}`,
          teamB: `${match.playerB1FirstName} ${match.playerB1LastName} & ${match.playerB2FirstName} ${match.playerB2LastName}`,
        },
        teamAFirstServer: match.teamAFirstServer as 1 | 2,
        teamBFirstServer: match.teamBFirstServer as 1 | 2,
      })

      // TODO: Restore games state
      // For each completed game, we should send GAME_COMPLETED events
      // For in-progress game, we should send START_NEW_GAME and restore rallies
      // This is Phase 3 work - for now, machine starts fresh
    }
  }, [match, games, actor])

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const isLoading = Boolean(!match || !games)
  const error: string | null = null

  return (
    <LiveStoreMatchContext.Provider
      value={{ actor, matchId, isLoading, error }}
    >
      {children}
    </LiveStoreMatchContext.Provider>
  )
}

// Hook to create a new match
export const useCreateLiveStoreMatch = () => {
  const { store } = useStore()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createMatch = (playerNames: ReadonlyArray<string>) => {
    setIsCreating(true)
    setError(null)

    try {
      const matchId = crypto.randomUUID() as MatchId

      // Commit match creation event
      store.commit(
        events.matchCreated({
          matchId,
          playerNames: [...playerNames],
          timestamp: new Date(),
        }),
      )

      setIsCreating(false)
      return matchId
    } catch (err) {
      setError(String(err))
      setIsCreating(false)
      return null
    }
  }

  return { createMatch, isCreating, error }
}
