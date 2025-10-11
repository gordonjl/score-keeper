import { useStore } from '@livestore/react'
import { useActorRef } from '@xstate/react'
import { useEffect, useMemo } from 'react'
import { squashGameMachine } from '../machines/squashGameMachine'
import { gameById$, ralliesByGame$ } from '../livestore/squash-queries'
import type { PlayerNameMap, Team } from '../machines/squashMachine'

/**
 * Hook to instantiate and manage squashGameMachine lifecycle with LiveStore integration.
 *
 * Following XState + LiveStore best practices:
 * - LiveStore is the source of truth for persistent data
 * - XState manages UI state transitions
 * - Uses useActorRef() for better performance (no re-renders on every state change)
 * - Reactively queries game and rallies from LiveStore
 * - Replays rallies to reconstruct grid state
 */
export const useSquashGameMachine = (
  gameId: string,
  players: PlayerNameMap,
) => {
  const { store } = useStore()

  const actorInput = useMemo(() => ({ gameId, store }), [gameId, store])

  // Create actor ref (doesn't cause re-renders on state changes)
  const actorRef = useActorRef(squashGameMachine, {
    // @ts-expect-error - LiveStore type compatibility issue
    input: actorInput,
  })

  // Query game data from LiveStore (reactive)
  const game = store.useQuery(gameById$(gameId))
  const rallies = store.useQuery(ralliesByGame$(gameId))

  // Reset machine when gameId changes
  useEffect(() => {
    const snapshot = actorRef.getSnapshot()
    const currentGameId = snapshot.context.gameId

    // If gameId changed, reset the machine
    if (currentGameId && currentGameId !== gameId) {
      console.log('[useSquashGameMachine] gameId changed - resetting', {
        from: currentGameId,
        to: gameId,
      })
      actorRef.send({ type: 'RESET' })
    }
  }, [gameId, actorRef])

  // Load game data when available and machine is ready
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!game) return

    const snapshot = actorRef.getSnapshot()

    // Only load if machine is in notConfigured state
    if (!snapshot.matches('notConfigured')) {
      console.log(
        '[useSquashGameMachine] Skipping load - not in notConfigured state',
        {
          currentState: snapshot.value,
          gameId,
        },
      )
      return
    }

    console.log('[useSquashGameMachine] Loading game', gameId)

    // Send GAME_LOADED event
    actorRef.send({
      type: 'GAME_LOADED',
      game,
      players,
    })

    // Replay rallies if needed
    if (game.status === 'in_progress' && rallies.length > 0) {
      console.log('[useSquashGameMachine] Replaying', rallies.length, 'rallies')
      for (const rally of rallies) {
        actorRef.send({
          type: 'RALLY_WON',
          winner: rally.winner as Team,
        })
      }
    }
  }, [game, rallies, actorRef, players, gameId])

  return { actorRef, game, rallies }
}
