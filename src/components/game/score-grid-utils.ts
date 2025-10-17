import type {
  ActivityGrid,
  Cell,
  PlayerRow,
  RowKey,
  Score,
  Server,
  Side,
  Team,
} from '../../machines/squashMachine.types'

// ===== Grid Building Utilities =====

export const makeEmptyCols = (n = 30): Array<Cell> =>
  Array.from({ length: n }, () => '')

export const initialGrid = (cols = 30): ActivityGrid => ({
  A1: makeEmptyCols(cols),
  A2: makeEmptyCols(cols),
  B1: makeEmptyCols(cols),
  B2: makeEmptyCols(cols),
  A: makeEmptyCols(cols),
  B: makeEmptyCols(cols),
})

export const writeCell = (
  grid: ActivityGrid,
  key: RowKey | 'A' | 'B',
  col: number,
  value: Cell,
): ActivityGrid => {
  // Only create new array for the row that's changing
  const newRow = [...grid[key]]
  newRow[col] = value

  return {
    A1: key === 'A1' ? newRow : grid.A1,
    A2: key === 'A2' ? newRow : grid.A2,
    B1: key === 'B1' ? newRow : grid.B1,
    B2: key === 'B2' ? newRow : grid.B2,
    A: key === 'A' ? newRow : grid.A,
    B: key === 'B' ? newRow : grid.B,
  }
}

export const rowKey = (team: Team, player: PlayerRow): RowKey =>
  `${team}${player}`

export const flip = (side: Side): Side => (side === 'R' ? 'L' : 'R')

export const otherTeam = (team: Team): Team => (team === 'A' ? 'B' : 'A')

export const colForTeamServe = (score: Score, team: Team): number => score[team]

// ===== Rally Processing Types =====

export type RallyState = {
  score: Score
  server: Server
  grid: ActivityGrid
  firstHandUsed: boolean
}

export type RallyData = {
  winner: Team
  rallyNumber: number
  serverTeam: Team
  serverPlayer: PlayerRow
  serverSide: Side
  serverHandIndex: 0 | 1
}

/**
 * Process a single rally and return the next grid state.
 * Pure function that takes current state and rally data.
 */
export const processRally = (
  state: RallyState,
  rally: RallyData,
): RallyState => {
  // Use the rally's server data (which includes any toggled side)
  const cur: Server = {
    team: rally.serverTeam,
    player: rally.serverPlayer,
    side: rally.serverSide,
    handIndex: rally.serverHandIndex,
  }
  const col = colForTeamServe(state.score, cur.team)
  const currentRow = rowKey(cur.team, cur.player)
  const winner = rally.winner

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

/**
 * Build grid from rallies by replaying them sequentially.
 * Each rally writes its own server position first, then processes the result.
 */
export const buildGridFromRallies = (
  rallies: ReadonlyArray<RallyData>,
  initialServer: Server,
  firstHandUsed: boolean,
): ActivityGrid => {
  const initialState: RallyState = {
    grid: initialGrid(),
    score: { A: 0, B: 0 },
    server: initialServer,
    firstHandUsed,
  }

  // Process each rally: write its server position, then process the result
  const finalState = rallies.reduce((state, rally) => {
    const col = state.score[rally.serverTeam]
    const serverRow = rowKey(rally.serverTeam, rally.serverPlayer)

    // Write this rally's server position
    const gridWithServer = writeCell(
      state.grid,
      serverRow,
      col,
      rally.serverSide,
    )

    // Process the rally result (add slashes, X, update score)
    return processRally(
      {
        ...state,
        grid: gridWithServer,
        server: {
          team: rally.serverTeam,
          player: rally.serverPlayer,
          side: rally.serverSide,
          handIndex: rally.serverHandIndex,
        },
      },
      rally,
    )
  }, initialState)

  return finalState.grid
}
