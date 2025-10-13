import { events } from '../livestore/schema'
import type { Team } from './squashMachine.types'
import type { Context, Game } from './squashGameMachine'

// ===== Actions (void functions that work with params only) =====

/**
 * Rally won action - emits event to LiveStore
 * @param context - Machine context (only needs store reference)
 * @param params - Extracted data from event (game and winner)
 */
export const rallyWon = (
  { context }: { context: Context },
  params: { game: Game; winner: Team },
) => {
  const { game, winner } = params
  const rallyNumber = game.scoreA + game.scoreB + 1

  // Only emit to LiveStore - actions are void functions!
  context.store.commit(
    events.rallyWon({
      rallyId: crypto.randomUUID(),
      gameId: game.id,
      rallyNumber,
      winner,
      serverTeam: game.currentServerTeam,
      serverPlayer: game.currentServerPlayer,
      serverSide: game.currentServerSide,
      serverHandIndex: game.currentServerHandIndex,
      scoreABefore: game.scoreA,
      scoreBBefore: game.scoreB,
      scoreAAfter: winner === 'A' ? game.scoreA + 1 : game.scoreA,
      scoreBAfter: winner === 'B' ? game.scoreB + 1 : game.scoreB,
      timestamp: new Date(),
    }),
  )
}

/**
 * Toggle serve side action - emits event to LiveStore
 * @param context - Machine context (only needs store reference)
 * @param params - Extracted data from event (game)
 */
export const toggleServeSide = (
  { context }: { context: Context },
  params: { game: Game },
) => {
  const { game } = params

  // Only toggle if first hand (handIndex === 0)
  if (game.currentServerHandIndex !== 0) return

  const newSide = game.currentServerSide === 'L' ? 'R' : 'L'
  context.store.commit(
    events.serverSideToggled({
      gameId: game.id,
      newSide,
      timestamp: new Date(),
    }),
  )
}

/**
 * Undo action - emits event to LiveStore
 * @param context - Machine context (only needs store reference)
 * @param params - Extracted data from event (game)
 */
export const undo = (
  { context }: { context: Context },
  params: { game: Game },
) => {
  const { game } = params

  // Only undo if there are rallies to undo (score > 0)
  if (game.scoreA === 0 && game.scoreB === 0) return

  // Emit LiveStore rallyUndone event
  context.store.commit(
    events.rallyUndone({
      gameId: game.id,
      rallyId: '', // LiveStore materializer will find the last rally
      timestamp: new Date(),
    }),
  )
}

// ===== Guards (boolean functions that work with params only) =====

/**
 * Check if game has ended based on score after rally
 * @param params - Extracted data (game and optional winner for score calculation)
 */
export const gameEnded = (
  _: { context: Context },
  params: { game: Game; winner?: Team; isInitialize?: boolean },
) => {
  const { game, winner, isInitialize } = params

  // For INITIALIZE event, check if game is already completed
  if (isInitialize) {
    return game.status === 'completed'
  }

  // Calculate score after event
  let { scoreA, scoreB } = game

  // For RALLY_WON events, calculate the score AFTER the rally
  if (winner) {
    if (winner === 'A') {
      scoreA = scoreA + 1
    } else {
      scoreB = scoreB + 1
    }
  }

  // Read maxPoints and winBy from game data, not context
  const { maxPoints, winBy } = game

  if (scoreA < maxPoints && scoreB < maxPoints) return false
  return Math.abs(scoreA - scoreB) >= winBy
}
