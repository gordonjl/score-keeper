import { useStore } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { useMemo } from 'react'
import { createActor } from 'xstate'
import { gameByNumber, gameWithRallies$ } from '../livestore/squash-queries'
import { squashGameMachine } from '../machines/squashGameMachine'
import type { PlayerNameMap, Team } from '../machines/squashMachine.types'

/**
 * Hook to instantiate and manage squashGameMachine lifecycle with LiveStore integration.
 *
 * Following XState + LiveStore best practices:
 * - LiveStore is the source of truth for persistent data
 * - XState manages UI state transitions
 * - Creates a new machine actor for each game (when gameId changes)
 * - Reactively queries game and rallies from LiveStore
 * - Replays rallies to reconstruct grid state on machine creation
 */
export const useSquashGameMachine = (
  matchId: string,
  gameNumber: number,
  players: PlayerNameMap,
) => {
  const { store } = useStore()

  // Step 1: Use gameByNumber to get the game UUID (does the join once)
  const gameByNumberResult = store.useQuery(gameByNumber(matchId, gameNumber))

  // Throw error if game not found - indicates bad route parameter
  if (!gameByNumberResult) {
    throw new Error(
      `Game not found: matchId=${matchId}, gameNumber=${gameNumber}. Invalid route parameter.`,
    )
  }

  const gameId = gameByNumberResult.id

  // Step 2: Use composite query to get game and rallies together
  const { game, rallies } = gameWithRallies$(gameId)
  const gameData = store.useQuery(game)
  const ralliesData = store.useQuery(rallies)

  // Create a new machine actor when gameId changes
  // This ensures each game gets a fresh machine instance
  const actorRef = useMemo(() => {
    const actor = createActor(squashGameMachine, {
      // @ts-expect-error - LiveStore type compatibility with XState
      input: { store },
    })

    actor.start()

    // Load game data
    actor.send({
      type: 'GAME_LOADED',
      game: gameData,
      players,
    })

    // Replay rallies to reconstruct grid state
    if (gameData.status === 'in_progress' && ralliesData.length > 0) {
      ralliesData.forEach((rally) => {
        actor.send({
          type: 'RALLY_WON',
          winner: rally.winner as Team,
        })
      })
    }

    return actor
  }, [gameId, store])

  // Get current state snapshot for convenience
  const state = useSelector(actorRef, (s) => s)

  return {
    actorRef,
    state,
    send: actorRef.send,
    game: gameData,
    rallies: ralliesData,
  }
}
