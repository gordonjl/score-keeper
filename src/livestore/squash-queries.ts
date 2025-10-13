import { queryDb } from '@livestore/livestore'
import { squashTables } from './tables'

// ============================================================================
// MATCH QUERIES
// ============================================================================

/**
 * Get match by ID
 */
export const matchById$ = (matchId: string) =>
  queryDb(() => squashTables.matches.where({ id: matchId }).first(), {
    label: `match-${matchId}`,
    deps: [matchId],
  })

/**
 * Get all active matches
 */
export const activeMatches$ = queryDb(
  () =>
    squashTables.matches
      .where({ status: 'active' })
      .orderBy('updatedAt', 'desc'),
  { label: 'active-matches' },
)

/**
 * Get all completed matches
 */
export const completedMatches$ = queryDb(
  () =>
    squashTables.matches
      .where({ status: 'completed' })
      .orderBy('updatedAt', 'desc'),
  { label: 'completed-matches' },
)

/**
 * Get all matches (any status)
 */
export const allMatches$ = queryDb(
  () => squashTables.matches.orderBy('updatedAt', 'desc'),
  { label: 'all-matches' },
)

/**
 * Get all non-archived matches (active and completed)
 */
export const nonArchivedMatches$ = queryDb(
  () => squashTables.matches.orderBy('updatedAt', 'desc'),
  {
    label: 'non-archived-matches',
    map: (matches) => matches.filter((match) => match.status !== 'archived'),
  },
)

// ============================================================================
// GAME QUERIES
// ============================================================================

/**
 * Get all games for a match
 */
export const gamesByMatch$ = (matchId: string) =>
  queryDb(
    () => squashTables.games.where({ matchId }).orderBy('gameNumber', 'asc'),
    {
      label: `games-${matchId}`,
      deps: [matchId],
    },
  )

/**
 * Get current in-progress game for a match
 */
export const currentGameByMatch$ = (matchId: string) =>
  queryDb(
    () => squashTables.games.where({ matchId, status: 'in_progress' }).first(),
    {
      label: `current-game-${matchId}`,
      deps: [matchId],
    },
  )

/**
 * Get game by ID
 */
export const gameById$ = (gameId: string) =>
  queryDb(() => squashTables.games.where({ id: gameId }).first(), {
    label: `game-${gameId}`,
    deps: [gameId],
  })

export const gameByNumber = (matchId: string, gameNumber: number) =>
  queryDb(
    () =>
      squashTables.games.where({ matchId, gameNumber }).first({
        fallback() {
          return null
        },
      }),
    {
      label: `game-${matchId}-${gameNumber}`,
      deps: [matchId, gameNumber],
    },
  )

/**
 * Get completed games for a match
 */
export const completedGamesByMatch$ = (matchId: string) =>
  queryDb(
    () =>
      squashTables.games
        .where({ matchId, status: 'completed' })
        .orderBy('gameNumber', 'asc'),
    {
      label: `completed-games-${matchId}`,
      deps: [matchId],
    },
  )

// ============================================================================
// RALLY QUERIES
// ============================================================================

/**
 * Get all active (non-deleted) rallies for a game
 */
export const ralliesByGame$ = (gameId: string) =>
  queryDb(
    () =>
      squashTables.rallies
        .where({ gameId, deletedAt: null })
        .orderBy('rallyNumber', 'asc'),
    {
      label: `rallies-${gameId}`,
      deps: [gameId],
    },
  )

/**
 * Get rally count for a game
 */
export const rallyCountByGame$ = (gameId: string) =>
  queryDb(() => squashTables.rallies.where({ gameId, deletedAt: null }), {
    label: `rally-count-${gameId}`,
    deps: [gameId],
    map: (rows) => rows.length,
  })

/**
 * Get last rally for a game (for undo)
 */
export const lastRallyByGame$ = (gameId: string) =>
  queryDb(
    () =>
      squashTables.rallies
        .where({ gameId, deletedAt: null })
        .orderBy('rallyNumber', 'desc')
        .first(),
    {
      label: `last-rally-${gameId}`,
      deps: [gameId],
    },
  )

// ============================================================================
// COMPOSITE QUERIES
// ============================================================================

/**
 * Get match summary with all games
 * Note: Use separate queries for match and games, then combine in component
 */
export const matchSummary$ = (matchId: string) => ({
  match: matchById$(matchId),
  games: gamesByMatch$(matchId),
})

/**
 * Get match with current game
 * Note: Use separate queries for match and currentGame, then combine in component
 */
export const matchWithCurrentGame$ = (matchId: string) => ({
  match: matchById$(matchId),
  currentGame: currentGameByMatch$(matchId),
})

/**
 * Get game with rallies
 * Note: Use separate queries for game and rallies, then combine in component
 */
export const gameWithRallies$ = (gameId: string) => ({
  game: gameById$(gameId),
  rallies: ralliesByGame$(gameId),
})

/**
 * Get match statistics
 * Note: Compute stats in component from gamesByMatch$ query
 * This is a helper function, not a reactive query
 */
export const computeMatchStats = (
  games: ReadonlyArray<{
    status: string
    winner: string | null
    scoreA: number
    scoreB: number
  }>,
) => {
  const completedGames = games.filter((g) => g.status === 'completed')

  const gamesWonA = completedGames.filter((g) => g.winner === 'A').length
  const gamesWonB = completedGames.filter((g) => g.winner === 'B').length

  const totalPointsA = completedGames.reduce((sum, g) => sum + g.scoreA, 0)
  const totalPointsB = completedGames.reduce((sum, g) => sum + g.scoreB, 0)

  return {
    gamesWonA,
    gamesWonB,
    totalPointsA,
    totalPointsB,
    gamesPlayed: completedGames.length,
    matchComplete: gamesWonA >= 3 || gamesWonB >= 3,
    matchWinner:
      gamesWonA >= 3 ? ('A' as const) : gamesWonB >= 3 ? ('B' as const) : null,
  }
}

// ============================================================================
// UI STATE QUERIES
// ============================================================================

/**
 * Get game UI state
 */
export const gameUiState$ = queryDb(() => squashTables.gameUiState.get(), {
  label: 'game-ui-state',
})
