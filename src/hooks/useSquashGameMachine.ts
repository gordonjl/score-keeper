import { useStore } from '@livestore/react'
import { useMachine } from '@xstate/react'
import { useEffect } from 'react'
import { gameByNumber, gameWithRallies$ } from '../livestore/squash-queries'
import { squashGameMachine } from '../machines/squashGameMachine'
import type { PlayerNameMap, Team } from '../machines/squashMachine.types'

/**
 * Hook to instantiate and manage squashGameMachine lifecycle with LiveStore integration.
 *
 * Following XState + LiveStore best practices:
 * - LiveStore is the source of truth for persistent data
 * - XState manages UI state transitions
 * - Uses useMachine() for standard XState React integration
 * - Reactively queries game and rallies from LiveStore
 * - Replays rallies to reconstruct grid state
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

  // Create machine with store as input
  const [state, send, actorRef] = useMachine(squashGameMachine, {
    // @ts-expect-error - LiveStore type compatibility issue
    input: { store },
  })

  // Load game data when the gameId (UUID) changes
  // gameId is stable and only changes when navigating to a different game
  useEffect(() => {
    // Reset machine and load new game data
    send({ type: 'RESET' })
    send({
      type: 'GAME_LOADED',
      game: gameData,
      players,
    })

    // Replay rallies if needed
    if (gameData.status === 'in_progress' && ralliesData.length > 0) {
      ralliesData.forEach((rally) => {
        send({
          type: 'RALLY_WON',
          winner: rally.winner as Team,
        })
      })
    }
    // Only depend on gameId - game, players, rallies are derived from it
  }, [gameId])

  return { actorRef, state, send, game: gameData, rallies: ralliesData }
}
