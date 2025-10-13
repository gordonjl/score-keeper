import { useQuery, useStore } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { useEffect, useMemo } from 'react'
import { createActor } from 'xstate'
import {
  gameById$,
  gameByNumber,
  ralliesByGame$,
} from '../livestore/squash-queries'
import { squashGameMachine } from '../machines/squashGameMachine'

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
export const useSquashGameMachine = (matchId: string, gameNumber: number) => {
  const { store } = useStore()
  
  // Query the game by match ID and game number
  const gameByNumberResult = useQuery(gameByNumber(matchId, gameNumber))

  if (!gameByNumberResult) {
    throw new Error(
      `Game not found: matchId=${matchId}, gameNumber=${gameNumber}`,
    )
  }

  const gameId = gameByNumberResult.id

  // Query game details and rallies
  const gameData = useQuery(gameById$(gameId))
  const ralliesData = useQuery(ralliesByGame$(gameId))

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

  // Initialize machine ONCE when actor is created
  // IMPORTANT: Only depends on actorRef to run once per actor creation
  useEffect(() => {
    actorRef.send({
      type: 'INITIALIZE',
      gameId: gameData.id,
      matchId: gameData.matchId,
      maxPoints: gameData.maxPoints,
      winBy: gameData.winBy,
      game: gameData,
    })
  }, [actorRef, gameData])

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
