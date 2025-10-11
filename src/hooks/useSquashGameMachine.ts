import { useStore } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { useEffect, useMemo } from 'react'
import { createActor } from 'xstate'
import {
  gameById$,
  gameByNumber,
  ralliesByGame$,
} from '../livestore/squash-queries'
import { squashGameMachine } from '../machines/squashGameMachine'
import type { PlayerNameMap } from '../machines/squashMachine.types'

/**
 * Hook to instantiate and manage squashGameMachine lifecycle with LiveStore integration.
 *
 * Following XState + LiveStore best practices:
 * - LiveStore is the source of truth for persistent data
 * - XState manages UI state transitions
 * - Creates a new machine actor for each game (when gameId changes)
 * - Reactively queries game data from LiveStore
 * - Server state is read directly from game table (no rally replay needed)
 */
export const useSquashGameMachine = (
  matchId: string,
  gameNumber: number,
  players: PlayerNameMap,
) => {
  const { store } = useStore()

  // Query the game by match ID and game number
  const gameByNumberResult = store.useQuery(gameByNumber(matchId, gameNumber))

  if (!gameByNumberResult) {
    throw new Error(
      `Game not found: matchId=${matchId}, gameNumber=${gameNumber}`,
    )
  }

  const gameId = gameByNumberResult.id

  // Query game details and rallies
  const gameData = store.useQuery(gameById$(gameId))
  const ralliesData = store.useQuery(ralliesByGame$(gameId))

  // Create a new machine actor when gameId changes
  // This ensures each game gets a fresh machine instance
  const actorRef = useMemo(() => {
    const actor = createActor(squashGameMachine, {
      // @ts-expect-error - LiveStore type compatibility with XState
      input: { store },
    })

    actor.start()

    return actor
  }, [gameId, store])

  // Load game data ONCE when actor is created
  // IMPORTANT: Only depends on actorRef to run once per actor creation
  // We intentionally capture gameData, players, ralliesData from closure
  // to avoid re-running when rallies update during gameplay (would cause infinite loop)
  useEffect(() => {
    // Load game data - server state is already in the game table (no replay needed!)
    actorRef.send({
      type: 'GAME_LOADED',
      game: gameData,
      players,
      rallyCount: ralliesData.length,
    })
  }, [actorRef])

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
