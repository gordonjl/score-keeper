import { Array as EffectArray } from 'effect'
import { events } from '../livestore/schema'
import { flip, otherTeam, rowKey } from './squashMachine.types'
import type {
  ActivityGrid,
  Cell,
  PlayerNameMap,
  PlayerRow,
  RowKey,
  Score,
  Server,
  Side,
  Team,
} from './squashMachine.types'
import type { Context, Game } from './squashGameMachine'

// ===== Helper Functions =====
// Re-export helpers for convenience
export { flip, otherTeam, rowKey }

const makeEmptyCols = (n = 30): Array<Cell> =>
  Array.from({ length: n }, () => '')

export const initialGrid = (cols = 30): ActivityGrid => ({
  A1: makeEmptyCols(cols),
  A2: makeEmptyCols(cols),
  B1: makeEmptyCols(cols),
  B2: makeEmptyCols(cols),
  A: makeEmptyCols(cols),
  B: makeEmptyCols(cols),
})

const writeCell = (
  grid: ActivityGrid,
  key: RowKey | 'A' | 'B',
  col: number,
  value: Cell,
): ActivityGrid => {
  const next: ActivityGrid = {
    A1: [...grid.A1],
    A2: [...grid.A2],
    B1: [...grid.B1],
    B2: [...grid.B2],
    A: [...grid.A],
    B: [...grid.B],
  }
  next[key][col] = value
  return next
}

const colForTeamServe = (score: Score, team: Team): number => score[team]

// ===== Core Rally Logic =====
/**
 * Pure function that processes a single rally and returns the next game state.
 * Used by both rallyWon (live play) and replayRallies (loading saved games).
 */
type RallyState = {
  score: Score
  server: Server
  grid: ActivityGrid
  firstHandUsed: boolean
}

const processRally = (state: RallyState, winner: Team): RallyState => {
  const cur = state.server
  const col = colForTeamServe(state.score, cur.team)
  const currentRow = rowKey(cur.team, cur.player)

  // Server won the rally
  if (winner === cur.team) {
    const nextScore: Score = {
      ...state.score,
      [winner]: state.score[winner] + 1,
    }
    const nextServer: Server = { ...cur, side: flip(cur.side) }
    const nextCol = nextScore[cur.team]
    const nextGrid = writeCell(state.grid, currentRow, nextCol, nextServer.side)

    return {
      score: nextScore,
      server: nextServer,
      grid: nextGrid,
      firstHandUsed: state.firstHandUsed,
    }
  }

  // Receiving team won - add slash to current cell
  const existingCell = state.grid[currentRow][col]
  const slashedCell: Cell = `${existingCell}/` as Cell
  const gridWithSlash = writeCell(state.grid, currentRow, col, slashedCell)

  const nextScore: Score = {
    A: winner === 'A' ? state.score.A + 1 : state.score.A,
    B: winner === 'B' ? state.score.B + 1 : state.score.B,
  }

  // First-hand exception at 0-0
  const isStartOfGame = state.score.A === 0 && state.score.B === 0
  if (isStartOfGame && !state.firstHandUsed) {
    const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
    const gridWithPartnerSlash = writeCell(gridWithSlash, partnerRow, 0, '/')

    const t = otherTeam(cur.team)
    const nextServer: Server = {
      team: t,
      player: 1,
      side: 'R',
      handIndex: 0,
    }
    const nextCol = nextScore[t]
    const finalGrid = writeCell(
      gridWithPartnerSlash,
      rowKey(t, 1),
      nextCol,
      nextServer.side,
    )

    return {
      score: nextScore,
      server: nextServer,
      grid: finalGrid,
      firstHandUsed: true,
    }
  }

  // First hand lost (not start of game)
  if (cur.handIndex === 0 && !state.firstHandUsed) {
    const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
    const gridWithPartnerSlash = writeCell(gridWithSlash, partnerRow, col, '/')

    const t = otherTeam(cur.team)
    const nextServer: Server = {
      team: t,
      player: 1,
      side: 'R',
      handIndex: 0,
    }
    const nextCol = nextScore[t]
    const finalGrid = writeCell(
      gridWithPartnerSlash,
      rowKey(t, 1),
      nextCol,
      nextServer.side,
    )

    return {
      score: nextScore,
      server: nextServer,
      grid: finalGrid,
      firstHandUsed: true,
    }
  }

  // First hand lost, partner serves (second hand)
  if (cur.handIndex === 0) {
    const xCol = nextScore[winner]
    const gridWithX = writeCell(gridWithSlash, winner, xCol, 'X')

    const partner: Server = {
      team: cur.team,
      player: cur.player === 1 ? 2 : 1,
      side: flip(cur.side),
      handIndex: 1,
    }
    const nextCol = state.score[cur.team]
    const finalGrid = writeCell(
      gridWithX,
      rowKey(partner.team, partner.player),
      nextCol,
      partner.side,
    )

    return {
      score: nextScore,
      server: partner,
      grid: finalGrid,
      firstHandUsed: true,
    }
  }

  // Second hand lost - hand-out to other team
  const t = otherTeam(cur.team)
  const nextServer: Server = {
    team: t,
    player: 1,
    side: 'R',
    handIndex: 0,
  }
  const nextCol = nextScore[t]
  const finalGrid = writeCell(
    gridWithSlash,
    rowKey(t, 1),
    nextCol,
    nextServer.side,
  )

  return {
    score: nextScore,
    server: nextServer,
    grid: finalGrid,
    firstHandUsed: true,
  }
}

// ===== Rally Replay =====
/**
 * Replays rallies to reconstruct grid state from rally history.
 * This is used when loading a game that's already in progress.
 * Does NOT emit LiveStore events (rallies already exist in DB).
 */
type RallyData = {
  winner: Team
  rallyNumber: number
}

const replayRallies = (
  initialContext: Partial<Context>,
  rallies: ReadonlyArray<RallyData>,
): Partial<Context> => {
  const server = initialContext.server!

  // Write initial serve position to column 0
  const gridWithInitialServe = writeCell(
    initialGrid(),
    rowKey(server.team, server.player),
    0,
    server.side,
  )

  const initialState: RallyState = {
    grid: gridWithInitialServe,
    score: { A: 0, B: 0 },
    server,
    firstHandUsed: initialContext.firstHandUsed!,
  }

  const finalState = EffectArray.reduce(rallies, initialState, (state, rally) =>
    processRally(state, rally.winner),
  )

  // Write current server position at current score column
  const currentCol = colForTeamServe(finalState.score, finalState.server.team)
  const gridWithCurrentServer = writeCell(
    finalState.grid,
    rowKey(finalState.server.team, finalState.server.player),
    currentCol,
    finalState.server.side,
  )

  // Return the replayed state
  return {
    score: finalState.score,
    server: finalState.server,
    grid: gridWithCurrentServer,
    firstHandUsed: finalState.firstHandUsed,
    rallyCount: rallies.length,
  }
}

// ===== Snapshot for History =====
export type Snapshot = {
  score: Score
  server: Server
  grid: ActivityGrid
  firstHandUsed: boolean
}

// ===== Actions =====
export const configureGameState = (
  context: Context,
  params: {
    game: Game
    players: PlayerNameMap
    rallies: ReadonlyArray<RallyData>
  },
): Partial<Context> => {
  const { game, players, rallies } = params

  // Initialize server from game data
  const server: Server = {
    team: game.firstServingTeam as Team,
    player: game.firstServingPlayer as PlayerRow,
    side: game.firstServingSide as Side,
    handIndex: 0 as const,
  }

  // Initialize grid with first serve pre-written
  const grid = writeCell(
    initialGrid(),
    rowKey(server.team, server.player),
    0,
    server.side,
  )

  const initialState: Partial<Context> = {
    gameId: game.id,
    matchId: game.matchId,
    maxPoints: game.maxPoints,
    winBy: game.winBy,
    players,
    score: { A: 0, B: 0 },
    server,
    grid,
    firstHandUsed: false,
    history: [],
    rallyCount: 0,
  }

  // Replay rallies if game is in progress
  if (game.status === 'in_progress' && rallies.length > 0) {
    // Merge initialState with replayed state to preserve all fields
    return {
      ...initialState,
      ...replayRallies(initialState, rallies),
    }
  }

  return initialState
}

export const snapshot = (context: Context): Partial<Context> => ({
  history: [
    ...context.history,
    {
      score: { ...context.score },
      server: { ...context.server },
      grid: { ...context.grid },
      firstHandUsed: context.firstHandUsed,
    },
  ],
})

export const toggleServeSide = (context: Context): Partial<Context> => {
  if (context.server.handIndex !== 0) return {}

  const newSide = flip(context.server.side)
  const col = colForTeamServe(context.score, context.server.team)
  const currentRow = rowKey(context.server.team, context.server.player)
  const nextGrid = writeCell(context.grid, currentRow, col, newSide)

  return {
    server: { ...context.server, side: newSide },
    grid: nextGrid,
  }
}

export const rallyWon = (
  context: Context,
  params: { winner: Team },
): Partial<Context> => {
  const { winner } = params
  const rallyNumber = context.rallyCount + 1

  // Emit LiveStore rallyWon event
  if (context.store && context.gameId) {
    context.store.commit(
      events.rallyWon({
        rallyId: crypto.randomUUID(),
        gameId: context.gameId,
        rallyNumber,
        winner,
        serverTeam: context.server.team,
        serverPlayer: context.server.player,
        serverSide: context.server.side,
        serverHandIndex: context.server.handIndex,
        scoreABefore: context.score.A,
        scoreBBefore: context.score.B,
        scoreAAfter: winner === 'A' ? context.score.A + 1 : context.score.A,
        scoreBAfter: winner === 'B' ? context.score.B + 1 : context.score.B,
        timestamp: new Date(),
      }),
    )
  }

  // Process rally using pure function
  const nextState = processRally(
    {
      score: context.score,
      server: context.server,
      grid: context.grid,
      firstHandUsed: context.firstHandUsed,
    },
    winner,
  )

  return {
    ...nextState,
    rallyCount: rallyNumber,
  }
}

export const undoOnce = (context: Context): Partial<Context> => {
  const prev = context.history.at(-1)
  if (!prev) return {}

  // Emit LiveStore rallyUndone event
  if (context.store && context.gameId && context.rallyCount > 0) {
    context.store.commit(
      events.rallyUndone({
        gameId: context.gameId,
        rallyId: '', // LiveStore materializer will find the last rally
        timestamp: new Date(),
      }),
    )
  }

  return {
    score: prev.score,
    server: prev.server,
    grid: prev.grid,
    firstHandUsed: prev.firstHandUsed,
    history: context.history.slice(0, -1),
    rallyCount: Math.max(0, context.rallyCount - 1),
  }
}

export const resetGameState = (): Partial<Context> => ({
  gameId: null,
  matchId: null,
  maxPoints: 15,
  winBy: 1,
  players: {
    A1: { firstName: 'A1', lastName: 'Player', fullName: 'A1 Player' },
    A2: { firstName: 'A2', lastName: 'Player', fullName: 'A2 Player' },
    B1: { firstName: 'B1', lastName: 'Player', fullName: 'B1 Player' },
    B2: { firstName: 'B2', lastName: 'Player', fullName: 'B2 Player' },
    teamA: 'Team A',
    teamB: 'Team B',
  },
  score: { A: 0, B: 0 },
  server: {
    team: 'A' as Team,
    player: 1 as PlayerRow,
    side: 'R' as Side,
    handIndex: 0 as const,
  },
  grid: initialGrid(),
  firstHandUsed: false,
  history: [],
  rallyCount: 0,
})

// ===== Guards =====
export const gameEnded = (
  _: unknown,
  params: {
    score: Score
    maxPoints: number
    winBy: number
  },
) => {
  const { score, maxPoints, winBy } = params
  const { A, B } = score
  if (A < maxPoints && B < maxPoints) return false
  return Math.abs(A - B) >= winBy
}
