import type {
  ActivityGrid,
  Cell,
  RowKey,
  Team,
} from '../../machines/squashMachine.types'

export type CellMetadata = {
  content: Cell
  isActive: boolean
  isClickable: boolean
  shouldRender: boolean
  rowSpan?: number
  rowKey: RowKey
  col: number
}

export type RowMetadata = {
  rowKey: RowKey
  playerLabel: string
  cells: ReadonlyArray<CellMetadata>
}

type ComputeGridParams = {
  grid: ActivityGrid
  rows: ReadonlyArray<RowKey>
  playerLabels: Record<string, string>
  serverRowKey: RowKey
  serverScore: number
  handIndex: 0 | 1
  isGameOver: boolean
  maxCols: number
  teamAPreferredSide: 'R' | 'L'
  teamBPreferredSide: 'R' | 'L'
}

/**
 * Compute metadata for a single cell.
 * Pure function - all logic in one place, easy to test and reason about.
 */
const computeCellMetadata = (params: {
  rowKey: RowKey
  col: number
  team: Team
  isFirstPlayerInPair: boolean
  grid: ActivityGrid
  serverRowKey: RowKey
  serverScore: number
  handIndex: 0 | 1
  isGameOver: boolean
  preferredSide: 'R' | 'L'
}): CellMetadata => {
  const {
    rowKey,
    col,
    team,
    isFirstPlayerInPair,
    grid,
    serverRowKey,
    serverScore,
    handIndex,
    isGameOver,
    preferredSide,
  } = params

  const playerCells = grid[rowKey]
  const teamXCells = grid[team]
  const hasX = teamXCells[col] === 'X'

  const isActive = rowKey === serverRowKey && col === serverScore

  // X-cell logic: first player renders with rowspan, second player skips
  if (hasX && isFirstPlayerInPair) {
    return {
      content: 'X',
      isActive,
      isClickable: false,
      shouldRender: true,
      rowSpan: 2,
      rowKey,
      col,
    }
  }

  if (hasX && !isFirstPlayerInPair) {
    return {
      content: '',
      isActive: false,
      isClickable: false,
      shouldRender: false,
      rowKey,
      col,
    }
  }

  // Regular cell logic
  const cellValue = playerCells[col]

  // Determine if this is first serve of hand (no prior cell or prior cell is empty)
  const prevCol = serverScore - 1
  const isFirstServeOfHand = prevCol < 0 || !playerCells[prevCol]

  // Determine if clickable (hand-in, first serve of hand, not game over)
  const isHandIn = handIndex === 0
  const isClickable = isActive && isHandIn && isFirstServeOfHand && !isGameOver

  // Use preferred side when it's hand-in and first serve (Choice situation)
  const content =
    isActive && isHandIn && isFirstServeOfHand ? preferredSide : cellValue

  return {
    content,
    isActive,
    isClickable,
    shouldRender: true,
    rowKey,
    col,
  }
}

/**
 * Compute all cells for a single row.
 */
const computeRowCells = (params: {
  rowKey: RowKey
  team: Team
  isFirstPlayerInPair: boolean
  grid: ActivityGrid
  serverRowKey: RowKey
  serverScore: number
  handIndex: 0 | 1
  isGameOver: boolean
  maxCols: number
  preferredSide: 'R' | 'L'
}): ReadonlyArray<CellMetadata> => {
  const { maxCols, ...rest } = params

  return Array.from({ length: maxCols }, (_, col) =>
    computeCellMetadata({ col, ...rest }),
  )
}

/**
 * Main computation function: converts raw grid data into render-ready metadata.
 * Pure function with no side effects - all complexity lives here, rendering is simple.
 */
export const computeGridMetadata = (
  params: ComputeGridParams,
): ReadonlyArray<RowMetadata> => {
  const {
    grid,
    rows,
    playerLabels,
    serverRowKey,
    serverScore,
    handIndex,
    isGameOver,
    maxCols,
    teamAPreferredSide,
    teamBPreferredSide,
  } = params

  // Process rows in pairs (each team has 2 players)
  const rowMetadata: Array<RowMetadata> = []

  for (const i of Array.from(
    { length: Math.floor(rows.length / 2) },
    (_, idx) => idx * 2,
  )) {
    const player1Key = rows[i]
    const player2Key = rows[i + 1]
    const team = player1Key.startsWith('A') ? 'A' : 'B'
    const preferredSide = team === 'A' ? teamAPreferredSide : teamBPreferredSide

    // Compute cells for both players in the pair
    const player1Cells = computeRowCells({
      rowKey: player1Key,
      team,
      isFirstPlayerInPair: true,
      grid,
      serverRowKey,
      serverScore,
      handIndex,
      isGameOver,
      maxCols,
      preferredSide,
    })

    const player2Cells = computeRowCells({
      rowKey: player2Key,
      team,
      isFirstPlayerInPair: false,
      grid,
      serverRowKey,
      serverScore,
      handIndex,
      isGameOver,
      maxCols,
      preferredSide,
    })

    rowMetadata.push({
      rowKey: player1Key,
      playerLabel: playerLabels[player1Key],
      cells: player1Cells,
    })

    rowMetadata.push({
      rowKey: player2Key,
      playerLabel: playerLabels[player2Key],
      cells: player2Cells,
    })
  }

  return rowMetadata
}
