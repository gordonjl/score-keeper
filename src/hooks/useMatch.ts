import { MatchMachineContext } from '../contexts/MatchMachineContext'

/**
 * Hook to get the current game actor from the match machine.
 * The game actor is spawned using spawnChild and accessed via snapshot.children.
 */
export const useCurrentGameActor = () => {
  return MatchMachineContext.useSelector((snapshot) => {
    const currentGameId = snapshot.context.currentGameId
    if (!currentGameId) return null

    // Access the spawned game actor from snapshot.children
    return snapshot.children[currentGameId] ?? null
  })
}
