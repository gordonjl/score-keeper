import { memo, useCallback } from 'react'
import { ScoreCell } from './ScoreCell'
import type {
  ActivityGrid,
  Cell,
  RowKey,
  Team,
} from '../../machines/squashMachine.types'

type TeamRowsProps = {
  team: Team
  player1Key: RowKey
  player2Key: RowKey
  grid: ActivityGrid
  playerLabels: Record<string, string>
  serverRowKey: RowKey
  serverScore: number
  handIndex: 0 | 1
  isGameOver: boolean
  onToggleServeSide: () => void
  maxCols: number
}

/**
 * TeamRows renders both players of a team and handles X-cell merging.
 * This component owns the logic for spanning X cells across both players.
 */
export const TeamRows = memo(
  ({
    team,
    player1Key,
    player2Key,
    grid,
    playerLabels,
    serverRowKey,
    serverScore,
    handIndex,
    isGameOver,
    onToggleServeSide,
    maxCols,
  }: TeamRowsProps) => {
    const player1Cells = grid[player1Key]
    const player2Cells = grid[player2Key]
    const teamXCells = grid[team] // Where X marks live

    // Stable empty callback for non-clickable cells
    const noopClick = useCallback(() => {}, [])

    // Stable callback for clickable cell
    const handleClickableCell = useCallback(() => {
      onToggleServeSide()
    }, [onToggleServeSide])

    const renderCell = (
      rowKey: RowKey,
      cells: ReadonlyArray<Cell>,
      col: number,
      isFirstPlayer: boolean,
    ) => {
      const hasX = teamXCells[col] === 'X'

      // If first player row and X exists, render merged cell with rowspan
      if (isFirstPlayer && hasX) {
        const isActive = rowKey === serverRowKey && col === serverScore
        return (
          <ScoreCell
            key={`${rowKey}-${col}`}
            cell="X"
            isActive={isActive}
            isClickable={false}
            onClick={noopClick}
            rowSpan={2}
          />
        )
      }

      // If second player row and X exists, skip (covered by rowspan above)
      if (!isFirstPlayer && hasX) {
        return null
      }

      // Regular cell rendering
      const cell = cells[col]
      const isActive = rowKey === serverRowKey && col === serverScore

      // Determine if clickable (hand-in, first serve of hand, not game over)
      const prevCol = serverScore - 1
      const isFirstServeOfHand = prevCol < 0 || !cells[prevCol]
      const isClickable =
        isActive && handIndex === 0 && isFirstServeOfHand && !isGameOver

      return (
        <ScoreCell
          key={`${rowKey}-${col}`}
          cell={cell}
          isActive={isActive}
          isClickable={isClickable}
          onClick={isClickable ? handleClickableCell : noopClick}
        />
      )
    }

    return (
      <>
        {/* First player row */}
        <tr>
          <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-200 z-10">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs text-primary font-semibold">
                {player1Key}
              </span>
              <span className="text-xs sm:text-sm truncate max-w-[50px] sm:max-w-[70px]">
                {playerLabels[player1Key]}
              </span>
            </div>
          </td>
          {Array.from({ length: maxCols }, (_, col) =>
            renderCell(player1Key, player1Cells, col, true),
          )}
        </tr>

        {/* Second player row */}
        <tr>
          <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-200 z-10">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs text-primary font-semibold">
                {player2Key}
              </span>
              <span className="text-xs sm:text-sm truncate max-w-[50px] sm:max-w-[70px]">
                {playerLabels[player2Key]}
              </span>
            </div>
          </td>
          {Array.from({ length: maxCols }, (_, col) =>
            renderCell(player2Key, player2Cells, col, false),
          )}
        </tr>
      </>
    )
  },
)

TeamRows.displayName = 'TeamRows'
