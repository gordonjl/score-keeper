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

/**
 * Set second team first server action - emits event to LiveStore
 * @param context - Machine context (only needs store reference)
 * @param params - Extracted data (game, team, and first server)
 */
export const setSecondTeamFirstServer = (
  { context }: { context: Context },
  params: { game: Game; team: Team; firstServer: 1 | 2 },
) => {
  const { game, team, firstServer } = params

  context.store.commit(
    events.secondTeamFirstServerSet({
      gameId: game.id,
      team,
      firstServer,
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

/**
 * Check if we need to get the second team's first server
 * Triggers when:
 * - Current server team changed from first serving team
 * - The new team's first server is null
 * - Current server hand index is 0 (first hand)
 * @param params - Extracted data (game and winner)
 */
export const needsSecondTeamFirstServer = (
  _: { context: Context },
  params: { game: Game; winner: Team },
) => {
  const { game, winner } = params

  // Only check if receiving team won (hand-out scenario)
  if (winner === game.currentServerTeam) {
    return false
  }

  // Determine which team will serve next
  const nextServingTeam: Team =
    game.currentServerHandIndex === 0 && !game.firstHandUsed
      ? winner // First hand exception: immediate hand-out
      : game.currentServerHandIndex === 0
        ? winner // Second hand lost: hand-out
        : game.currentServerTeam // First hand lost: partner serves

  // Check if next serving team's first server is null and it's their first hand
  const nextTeamFirstServer =
    nextServingTeam === 'A' ? game.teamAFirstServer : game.teamBFirstServer

  // Need modal if next team's first server is null and they're about to serve
  return nextTeamFirstServer === null && nextServingTeam === winner
}

/**
 * Check if we need to be in gettingSecondTeamFirstServer state during initialization
 * This happens when:
 * - One team has served (their first server is set)
 * - The other team is now serving (current server team is different from first serving team)
 * - The current serving team's first server is null
 * @param params - Extracted data (game)
 */
export const needsSecondTeamFirstServerOnInit = (
  _: { context: Context },
  params: { game: Game },
) => {
  const { game } = params

  // Check if current serving team's first server is null
  const currentTeamFirstServer =
    game.currentServerTeam === 'A'
      ? game.teamAFirstServer
      : game.teamBFirstServer

  // If current team's first server is null and they're serving, we need the modal
  // This means we're in the middle of getting the second team's first server
  return currentTeamFirstServer === null && game.currentServerHandIndex === 0
}
