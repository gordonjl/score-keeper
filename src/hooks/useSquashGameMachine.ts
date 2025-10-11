import { useStore } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { useEffect, useMemo } from 'react'
import { createActor } from 'xstate'
import { gameById$, gameByNumber, ralliesByGame$ } from '../livestore/squash-queries'
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
  console.log('🔵 [useSquashGameMachine] Hook called with:', { matchId, gameNumber })
  
  const { store } = useStore()

  // Step 1: Query the game using the query definition with deps
  console.log('🎯 [useSquashGameMachine] Querying with:', { matchId, gameNumber })
  const gameByNumberResult = store.useQuery(gameByNumber(matchId, gameNumber))

  console.log('🔍 [useSquashGameMachine] Query result for gameNumber', gameNumber, ':', gameByNumberResult)

  // Throw error if game not found - indicates bad route parameter
  if (!gameByNumberResult) {
    console.error('❌ [useSquashGameMachine] Game not found! matchId:', matchId, 'gameNumber:', gameNumber)
    throw new Error(
      `Game not found: matchId=${matchId}, gameNumber=${gameNumber}. Invalid route parameter.`,
    )
  }

  const gameId = gameByNumberResult.id
  console.log('✅ [useSquashGameMachine] Resolved gameId:', gameId, 'for gameNumber:', gameNumber)

  // Step 2: Query game and rallies using query definitions
  const gameData = store.useQuery(gameById$(gameId))
  const ralliesData = store.useQuery(ralliesByGame$(gameId))
  
  console.log('📊 [useSquashGameMachine] Game data:', {
    gameId: gameData.id,
    gameNumber: gameData.gameNumber,
    status: gameData.status,
    ralliesCount: ralliesData.length,
  })

  // Create a new machine actor when gameId changes
  // This ensures each game gets a fresh machine instance
  const actorRef = useMemo(() => {
    console.log('🆕 [useSquashGameMachine] ===== CREATING NEW ACTOR ===== for gameId:', gameId, 'gameNumber:', gameData.gameNumber)
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
    console.log('📥 [useSquashGameMachine] Loading game data into actor for gameId:', gameId, {
      gameNumber: gameData.gameNumber,
      status: gameData.status,
      ralliesCount: ralliesData.length,
    })

    // Load game data
    actorRef.send({
      type: 'GAME_LOADED',
      game: gameData,
      players,
    })

    // Replay rallies to reconstruct grid state (only initial rallies)
    if (gameData.status === 'in_progress' && ralliesData.length > 0) {
      console.log('🔄 [useSquashGameMachine] Replaying', ralliesData.length, 'rallies')
      ralliesData.forEach((rally) => {
        actorRef.send({
          type: 'RALLY_WON',
          winner: rally.winner as Team,
        })
      })
    }

    console.log('✅ [useSquashGameMachine] Game loaded successfully into actor')
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
