import { useQuery, useStore } from '@livestore/react'
import { useActorRef, useSelector } from '@xstate/react'
import {
  gameById$,
  gameByNumber,
  ralliesByGame$,
} from '../livestore/squash-queries'
import { squashGameMachine } from '../machines/squashGameMachine'

/**
 * Hook to instantiate and manage squashGameMachine lifecycle with LiveStore integration.
 *
 * Following XState + LiveStore best practices (learned from official examples):
 * - LiveStore is the source of truth for persistent data
 * - XState manages UI state transitions and game flow
 * - useActorRef() creates a NEW actor when gameId changes
 * - Actor is initialized with game identity via input (not INITIALIZE event)
 * - useSelector() provides fine-grained reactivity
 * - When switching games, React creates a fresh actor with new input
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

  // Use XState React hook to create and manage actor lifecycle
  // useActorRef creates a NEW actor when gameId changes (XState best practice)
  // This ensures each game gets a fresh machine instance with proper initialization
  const actorRef = useActorRef(squashGameMachine, {
    input: { store, gameId },
  })

  // Get current state snapshot for convenience
  const state = useSelector(actorRef, (s) => s)

  return {
    actorRef,
    state,
    // XState actor.send is already bound, safe to extract
    // eslint-disable-next-line @typescript-eslint/unbound-method
    send: actorRef.send,
    game: gameData,
    rallies: ralliesData,
  }
}
