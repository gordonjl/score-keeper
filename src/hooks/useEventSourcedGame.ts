import { useEventSourcedMatch } from '../contexts/EventSourcedMatchContext'

/**
 * Hook to get the current game actor from the event-sourced match machine.
 * This is compatible with the existing useCurrentGameActor hook.
 */
export const useEventSourcedGameActor = () => {
  const { actor } = useEventSourcedMatch()

  if (!actor) return null

  const snapshot = actor.getSnapshot()
  const currentGameId = snapshot.context.currentGameId

  if (!currentGameId) return null

  // Access the spawned game actor from snapshot.children
  return snapshot.children[currentGameId] ?? null
}

/**
 * Hook to send events to the event-sourced match actor.
 */
export const useEventSourcedMatchSend = () => {
  const { actor } = useEventSourcedMatch()

  return (event: unknown) => {
    if (!actor) {
      console.warn('Cannot send event: actor not initialized')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor.send(event as any)
  }
}

/**
 * Hook to get the match context from the event-sourced actor.
 */
export const useEventSourcedMatchContext = () => {
  const { actor } = useEventSourcedMatch()

  if (!actor) return null

  return actor.getSnapshot().context
}

/**
 * Hook to get the match state value.
 */
export const useEventSourcedMatchState = () => {
  const { actor } = useEventSourcedMatch()

  if (!actor) return null

  return actor.getSnapshot().value
}
