import { memo, useCallback } from 'react'
import { ScoreCell } from './ScoreCell'
import type { Cell, RowKey } from '../../machines/squashMachine.types'

type ScoreRowProps = {
  rowKey: RowKey
  playerLabel: string
  cells: ReadonlyArray<Cell>
  teamCells: ReadonlyArray<Cell>
  serverRowKey: RowKey
  serverScore: number
  handIndex: 0 | 1
  isGameOver: boolean
  onToggleServeSide: () => void
  maxCols: number
}

export const ScoreRow = memo(
  ({
    rowKey,
    playerLabel,
    cells,
    teamCells,
    serverRowKey,
    serverScore,
    handIndex,
    isGameOver,
    onToggleServeSide,
    maxCols,
  }: ScoreRowProps) => {
    // Stable empty callback for non-clickable cells
    const noopClick = useCallback(() => {}, [])

    // Stable callback for clickable cell
    const handleClickableCell = useCallback(() => {
      onToggleServeSide()
    }, [onToggleServeSide])

    const renderCell = (col: number) => {
      const cell = cells[col]
      const isActive = rowKey === serverRowKey && col === serverScore

      // Determine if clickable (hand-in, first serve of hand, not game over)
      const prevCol = serverScore - 1
      const isFirstServeOfHand = prevCol < 0 || !cells[prevCol]
      const isClickable =
        isActive && handIndex === 0 && isFirstServeOfHand && !isGameOver

      // Handle merged X cells
      const isTopOfTeam = rowKey === 'A1' || rowKey === 'B1'
      const isBottomOfTeam = rowKey === 'A2' || rowKey === 'B2'
      const teamCell = teamCells[col]

      // If top row and team has X, render merged cell
      if (isTopOfTeam && teamCell === 'X') {
        const isHandOut = isActive && handIndex === 1
        return (
          <ScoreCell
            key={`${rowKey}-${col}`}
            cell="X"
            isActive={isActive}
            isHandOut={isHandOut}
            isClickable={false}
            onClick={noopClick}
            rowSpan={2}
          />
        )
      }

      // If bottom row and team has X, skip (already merged above)
      if (isBottomOfTeam && teamCell === 'X') {
        return null
      }

      const isHandOut = isActive && handIndex === 1
      return (
        <ScoreCell
          key={`${rowKey}-${col}`}
          cell={cell}
          isActive={isActive}
          isHandOut={isHandOut}
          isClickable={isClickable}
          onClick={isClickable ? handleClickableCell : noopClick}
        />
      )
    }

    return (
      <tr>
        <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-200 z-10">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs text-primary font-semibold">
              {rowKey}
            </span>
            <span className="text-xs sm:text-sm truncate max-w-[50px] sm:max-w-[70px]">
              {playerLabel}
            </span>
          </div>
        </td>
        {Array.from({ length: maxCols }, (_, col) => renderCell(col))}
      </tr>
    )
  },
)

ScoreRow.displayName = 'ScoreRow'
