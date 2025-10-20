import { useMemo } from 'react'
import { computeGridMetadata } from './score-table-logic'
import type { ActivityGrid, RowKey } from '../../machines/squashMachine.types'
import type { CellMetadata } from './score-table-logic'

type ScoreTableProps = {
  grid: ActivityGrid
  rows: ReadonlyArray<RowKey>
  playerLabels: Record<string, string>
  serverRowKey: RowKey
  serverScore: number
  handIndex: 0 | 1
  isGameOver: boolean
  onToggleServeSide: () => void
  maxCols: number
  teamAPreferredSide: 'R' | 'L'
  teamBPreferredSide: 'R' | 'L'
}

/**
 * Simple cell component - no logic, just presentation.
 */
const Cell = ({
  cell,
  onClick,
}: {
  cell: CellMetadata
  onClick: () => void
}) => {
  const bgColor = cell.isClickable
    ? 'bg-warning/20 font-bold'
    : cell.isActive
      ? 'bg-primary/20 font-bold'
      : ''

  return (
    <td
      rowSpan={cell.rowSpan}
      onClick={cell.isClickable ? onClick : undefined}
      className={`border border-base-300 p-0.5 sm:p-1 text-center text-[10px] sm:text-xs min-w-[24px] sm:min-w-[28px] md:min-w-[32px] ${bgColor} ${cell.isClickable ? 'cursor-pointer hover:bg-primary/40' : ''}`}
      title={cell.isClickable ? 'Click to toggle R/L' : ''}
    >
      {cell.content || ''}
    </td>
  )
}

export const ScoreTable = ({
  grid,
  rows,
  playerLabels,
  serverRowKey,
  serverScore,
  handIndex,
  isGameOver,
  onToggleServeSide,
  maxCols,
  teamAPreferredSide,
  teamBPreferredSide,
}: ScoreTableProps) => {
  // Compute all render metadata upfront - pure function, easy to test
  const rowsMetadata = useMemo(
    () =>
      computeGridMetadata({
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
      }),
    [
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
    ],
  )

  // Simple rendering - just map over computed metadata
  return (
    <div className="card bg-base-100 shadow-xl mb-3 sm:mb-4 border border-base-300">
      <div className="card-body p-1.5 sm:p-2 md:p-4">
        <div className="overflow-x-auto -mx-1.5 sm:-mx-2 md:mx-0 rounded-lg">
          <table className="table table-xs w-full">
            <thead>
              <tr>
                <th className="border border-base-300 p-0.5 sm:p-1 text-center sticky left-0 bg-base-200 z-10 min-w-[55px] sm:min-w-[75px] md:min-w-[95px] font-bold">
                  <span className="text-[9px] sm:text-[10px]">Player</span>
                </th>
                {Array.from({ length: maxCols }, (_, i) => (
                  <th
                    key={i}
                    className="border border-base-300 p-0.5 sm:p-1 text-center text-[9px] sm:text-[10px] min-w-[24px] sm:min-w-[28px] md:min-w-[32px] bg-base-200 font-bold"
                  >
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsMetadata.map((row) => (
                <tr key={row.rowKey}>
                  <td className="border border-base-300 p-0.5 sm:p-1 font-bold sticky left-0 bg-base-200 z-10">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] sm:text-[10px] text-primary font-semibold">
                        {row.rowKey}
                      </span>
                      <span
                        className="text-[10px] sm:text-xs truncate max-w-[50px] sm:max-w-[70px] md:max-w-[90px]"
                        title={row.playerLabel}
                      >
                        {row.playerLabel}
                      </span>
                    </div>
                  </td>
                  {row.cells
                    .filter((cell) => cell.shouldRender)
                    .map((cell) => (
                      <Cell
                        key={`${cell.rowKey}-${cell.col}`}
                        cell={cell}
                        onClick={onToggleServeSide}
                      />
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
