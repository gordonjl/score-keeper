import { Effect, Runtime } from 'effect'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { EventStore } from '../db/eventStore'
import { MatchManager } from '../db/matchManager'
import { StateReconstructor } from '../db/stateReconstructor'
import type { MatchId } from '../db/types'
import type { matchMachine } from '../machines/matchMachine'
import type { ActorRefFrom } from 'xstate'

// Runtime for executing Effects
const runtime = Runtime.defaultRuntime

// Context type
type EventSourcedMatchContextType = {
  readonly actor: ActorRefFrom<typeof matchMachine> | null
  readonly matchId: MatchId | null
  readonly isLoading: boolean
  readonly error: string | null
}

const EventSourcedMatchContext = createContext<EventSourcedMatchContextType | null>(null)

// Hook to use the context
export const useEventSourcedMatch = () => {
  const context = useContext(EventSourcedMatchContext)
  if (!context) {
    throw new Error('useEventSourcedMatch must be used within EventSourcedMatchProvider')
  }
  return context
}

// Provider props
type EventSourcedMatchProviderProps = {
  readonly matchId: MatchId
  readonly children: React.ReactNode
}

// Snapshot trigger - every N events
const SNAPSHOT_INTERVAL = 20

// Helper to count total events in match
// For now, use a simple counter based on games played
const countMatchEvents = (actor: ActorRefFrom<typeof matchMachine>): number => {
  const { context } = actor.getSnapshot()
  // Approximate: each game represents multiple events
  // This is a simple heuristic until we track actual event count
  return context.games.length * 10
}

// Provider component
export const EventSourcedMatchProvider = ({
  matchId,
  children,
}: EventSourcedMatchProviderProps) => {
  const [actor, setActor] = useState<ActorRefFrom<typeof matchMachine> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastEventCountRef = useRef(0)

  // Reconstruct state from events on mount
  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const program = StateReconstructor.reconstructMatchState(matchId)

    Runtime.runPromise(runtime)(
      Effect.matchEffect(program, {
        onFailure: (err) =>
          Effect.sync(() => {
            setError(String(err))
            setIsLoading(false)
          }),
        onSuccess: (reconstructedActor) =>
          Effect.sync(() => {
            setActor(reconstructedActor)
            setIsLoading(false)
            lastEventCountRef.current = countMatchEvents(reconstructedActor)
          }),
      }),
    )
  }, [matchId])

  // Subscribe to state changes and persist events
  useEffect(() => {
    if (!actor) return

    const subscription = actor.subscribe((snapshot) => {
      // XState v5: events are not directly on snapshot
      // We need to track transitions differently
      // For now, persist on any state change
      const currentState = snapshot.value

      // Persist state changes (simplified approach)
      // Store the entire snapshot as the event payload
      const program = EventStore.appendEvent(
        matchId,
        'STATE_CHANGE',
        { state: currentState, context: snapshot.context }
      )

      Runtime.runPromise(runtime)(
        Effect.matchEffect(program, {
          onFailure: (err) =>
            Effect.sync(() => {
              console.error('Failed to persist event:', err)
            }),
          onSuccess: () => Effect.void,
        }),
      )

      // Check if we should create a snapshot
      const currentEventCount = countMatchEvents(actor)
      if (
        currentEventCount > 0 &&
        currentEventCount % SNAPSHOT_INTERVAL === 0 &&
        currentEventCount !== lastEventCountRef.current
      ) {
        lastEventCountRef.current = currentEventCount

        const persistedSnapshot = actor.getPersistedSnapshot()
        const snapshotProgram = EventStore.createSnapshot(
          matchId,
          persistedSnapshot,
          currentEventCount,
        )

        Runtime.runPromise(runtime)(
          Effect.matchEffect(snapshotProgram, {
            onFailure: (err) =>
              Effect.sync(() => {
                console.error('Failed to create snapshot:', err)
              }),
            onSuccess: () => Effect.void,
          }),
        )
      }
    })

    return () => subscription.unsubscribe()
  }, [actor, matchId])

  // Cleanup on unmount
  useEffect(
    () => () => {
      actor?.stop()
    },
    [actor],
  )

  return (
    <EventSourcedMatchContext.Provider
      value={{ actor, matchId, isLoading, error }}
    >
      {children}
    </EventSourcedMatchContext.Provider>
  )
}

// Hook to create a new match
export const useCreateEventSourcedMatch = () => {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createMatch = (playerNames: ReadonlyArray<string>) => {
    setIsCreating(true)
    setError(null)

    const program = MatchManager.createMatch(playerNames)

    return Runtime.runPromise(runtime)(
      Effect.matchEffect(program, {
        onFailure: (err) =>
          Effect.sync(() => {
            setError(String(err))
            setIsCreating(false)
            return null
          }),
        onSuccess: (newMatchId) =>
          Effect.sync(() => {
            setIsCreating(false)
            return newMatchId
          }),
      }),
    )
  }

  return { createMatch, isCreating, error }
}
