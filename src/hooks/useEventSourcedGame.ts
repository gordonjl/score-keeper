import { getCurrentGameId } from '../machines/matchMachine'
import { useLiveStoreMatch } from '../contexts/LiveStoreMatchContext'
import type { squashGameMachine } from '../machines/squashGameMachine'
import type { ActorRefFrom } from 'xstate'

/**
 * Hook to get the current game actor from the LiveStore match machine.
 * This is compatible with the existing useCurrentGameActor hook.
 *
 * @param gameId - Optional game ID to retrieve. If not provided, derives currentGameId from state.
 */
export const useEventSourcedGameActor = (gameId?: string) => {
  const { actor } = useLiveStoreMatch()

  if (!actor) return null

  const snapshot = actor.getSnapshot()
  const targetGameId = gameId ?? getCurrentGameId(snapshot)

  if (!targetGameId) return null

  // Access the spawned game actor from snapshot.children
  const gameActor = (
    snapshot.children as Record<
      string,
      ActorRefFrom<typeof squashGameMachine> | undefined
    >
  )[targetGameId]

  return gameActor ?? null
}

/**
 * Hook to send events to the LiveStore match actor.
 */
export const useEventSourcedMatchSend = () => {
  const { actor } = useLiveStoreMatch()

  return (event: unknown) => {
    if (!actor) {
      console.warn('Cannot send event: actor not initialized')
      return
    }

    actor.send(event as any)
  }
}

/**
 * Hook to get the match context from the LiveStore actor.
 */
export const useEventSourcedMatchContext = () => {
  const { actor } = useLiveStoreMatch()

  if (!actor) return null

  return actor.getSnapshot().context
}

/**
 * Hook to get the match state value.
 */
export const useEventSourcedMatchState = () => {
  const { actor } = useLiveStoreMatch()

  if (!actor) return null

  return actor.getSnapshot().value
}
