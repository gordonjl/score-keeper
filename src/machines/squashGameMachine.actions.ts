import { events } from '../livestore/schema'
import type { Team } from './squashMachine.types'
import type { Context, Events, Game } from './squashGameMachine'

// ===== Actions (void functions that emit events to LiveStore) =====

/**
 * Initialize action - sets game configuration in context
 */
export const initialize = ({
  event,
}: {
  context: Context
  event: Events
}): Partial<Context> => {
  if (event.type !== 'INITIALIZE') return {}

  return {
    gameId: event.gameId,
    matchId: event.matchId,
    maxPoints: event.maxPoints,
    winBy: event.winBy,
  }
}

/**
 * Rally won action - emits event to LiveStore only
 */
export const rallyWon = ({
  context,
  event,
}: {
  context: Context
  event: Events
}) => {
  if (event.type !== 'RALLY_WON') return

  const { winner, game } = event
  const rallyNumber = game.scoreA + game.scoreB + 1

  // Only emit to LiveStore - actions are void functions!
  if (context.store && context.gameId) {
    context.store.commit(
      events.rallyWon({
        rallyId: crypto.randomUUID(),
        gameId: context.gameId,
        rallyNumber,
        winner,
        serverTeam: game.currentServerTeam as Team,
        serverPlayer: game.currentServerPlayer as 1 | 2,
        serverSide: game.currentServerSide as 'R' | 'L',
        serverHandIndex: game.currentServerHandIndex as 0 | 1,
        scoreABefore: game.scoreA,
        scoreBBefore: game.scoreB,
        scoreAAfter: winner === 'A' ? game.scoreA + 1 : game.scoreA,
        scoreBAfter: winner === 'B' ? game.scoreB + 1 : game.scoreB,
        timestamp: new Date(),
      }),
    )
  }
}

/**
 * Toggle serve side action - emits event to LiveStore
 */
export const toggleServeSide = ({
  context,
  event,
}: {
  context: Context
  event: Events
}) => {
  if (event.type !== 'TOGGLE_SERVE_SIDE') return

  const { game } = event

  // Only toggle if first hand (handIndex === 0)
  if (game.currentServerHandIndex !== 0) return

  const newSide = game.currentServerSide === 'L' ? 'R' : 'L'
  if (context.store && context.gameId) {
    context.store.commit(
      events.serverSideToggled({
        gameId: context.gameId,
        newSide,
        timestamp: new Date(),
      }),
    )
  }
}

/**
 * Undo action - emits event to LiveStore
 */
export const undo = ({
  context,
  event,
}: {
  context: Context
  event: Events
}) => {
  if (event.type !== 'UNDO') return

  const { game } = event

  // Only undo if there are rallies to undo (score > 0)
  if (game.scoreA === 0 && game.scoreB === 0) return

  // Emit LiveStore rallyUndone event
  if (context.store && context.gameId) {
    context.store.commit(
      events.rallyUndone({
        gameId: context.gameId,
        rallyId: '', // LiveStore materializer will find the last rally
        timestamp: new Date(),
      }),
    )
  }
}

// ===== Guards (boolean functions that determine transitions) =====

/**
 * Check if game has ended based on score
 */
export const gameEnded = ({
  context,
  event,
}: {
  context: Context
  event: Events
}) => {
  // Guard needs game data from event
  let game: Game | undefined

  if (
    event.type === 'INITIALIZE' ||
    event.type === 'RALLY_WON' ||
    event.type === 'TOGGLE_SERVE_SIDE' ||
    event.type === 'UNDO'
  ) {
    game = event.game
  }

  if (!game) return false

  // For INITIALIZE event, check if game is already completed
  if (event.type === 'INITIALIZE') {
    // If game status is 'completed', transition to awaitingConfirmation
    if (game.status === 'completed') {
      return true
    }
    // Otherwise check if score indicates game should end
    const { scoreA, scoreB } = game
    const { maxPoints, winBy } = context
    if (scoreA >= maxPoints || scoreB >= maxPoints) {
      return Math.abs(scoreA - scoreB) >= winBy
    }
    return false
  }

  let { scoreA, scoreB } = game
  const { maxPoints, winBy } = context

  // For RALLY_WON events, calculate the score AFTER the rally
  // (event contains pre-rally state, but we need to check post-rally state)
  if (event.type === 'RALLY_WON') {
    if (event.winner === 'A') {
      scoreA = scoreA + 1
    } else {
      scoreB = scoreB + 1
    }
  }

  if (scoreA < maxPoints && scoreB < maxPoints) return false
  return Math.abs(scoreA - scoreB) >= winBy
}
