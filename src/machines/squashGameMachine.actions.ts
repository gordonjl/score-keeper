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
  params: { game: Game; players: PlayerNameMap },
): Partial<Context> => {
  const { game, players } = params

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

  return {
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
    store: context.store,
  }
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
  const cur = context.server
  const col = colForTeamServe(context.score, cur.team)
  const rallyNumber = context.rallyCount + 1
  const currentRow = rowKey(cur.team, cur.player)

  // Start with current grid
  const updates: Partial<Context> = {
    rallyCount: rallyNumber,
  }

  // Emit LiveStore rallyWon event
  if (context.store && context.gameId) {
    context.store.commit(
      events.rallyWon({
        rallyId: crypto.randomUUID(),
        gameId: context.gameId,
        rallyNumber,
        winner,
        serverTeam: cur.team,
        serverPlayer: cur.player,
        serverSide: cur.side,
        serverHandIndex: cur.handIndex,
        scoreABefore: context.score.A,
        scoreBBefore: context.score.B,
        scoreAAfter: winner === 'A' ? context.score.A + 1 : context.score.A,
        scoreBAfter: winner === 'B' ? context.score.B + 1 : context.score.B,
        timestamp: new Date(),
      }),
    )
  }

  // Server won the rally
  if (winner === cur.team) {
    const nextScore: Score = {
      ...context.score,
      [winner]: context.score[winner] + 1,
    }
    const nextServer: Server = { ...cur, side: flip(cur.side) }
    const nextCol = nextScore[cur.team]
    const nextGrid = writeCell(
      context.grid,
      currentRow,
      nextCol,
      nextServer.side,
    )

    return {
      ...updates,
      score: nextScore,
      server: nextServer,
      grid: nextGrid,
    }
  }

  // Receiving team won - add slash to current cell
  const existingCell = context.grid[currentRow][col]
  const slashedCell: Cell = `${existingCell}/` as Cell
  const gridWithSlash = writeCell(context.grid, currentRow, col, slashedCell)

  const nextScore: Score = {
    A: winner === 'A' ? context.score.A + 1 : context.score.A,
    B: winner === 'B' ? context.score.B + 1 : context.score.B,
  }

  // First-hand exception at 0-0
  const isStartOfGame = context.score.A === 0 && context.score.B === 0
  if (isStartOfGame && !context.firstHandUsed) {
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
      ...updates,
      score: nextScore,
      server: nextServer,
      grid: finalGrid,
      firstHandUsed: true,
    }
  }

  // First hand lost (not start of game)
  if (cur.handIndex === 0 && !context.firstHandUsed) {
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
      ...updates,
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
    const nextCol = context.score[cur.team]
    const finalGrid = writeCell(
      gridWithX,
      rowKey(partner.team, partner.player),
      nextCol,
      partner.side,
    )

    return {
      ...updates,
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
    ...updates,
    score: nextScore,
    server: nextServer,
    grid: finalGrid,
    firstHandUsed: true,
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
