import { ScoreRow } from './ScoreRow'
import type { ActivityGrid, RowKey } from '../../machines/squashMachine.types'

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
}: ScoreTableProps) => {
  return (
    <div className="card bg-base-100 shadow-xl mb-4 border border-base-300">
      <div className="card-body p-2 sm:p-4">
        <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg">
          <table className="table table-xs w-full">
            <thead>
              <tr>
                <th className="border border-base-300 p-1 text-center sticky left-0 bg-base-200 z-10 min-w-[60px] sm:min-w-[80px] font-bold">
                  <span className="text-[10px] sm:text-xs">Player</span>
                </th>
                {Array.from({ length: maxCols }, (_, i) => (
                  <th
                    key={i}
                    className="border border-base-300 p-1 text-center text-[10px] sm:text-xs min-w-[28px] sm:min-w-[32px] bg-base-200 font-bold"
                  >
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                // Determine team row for X-cell merging
                const teamRow = row.startsWith('A') ? 'A' : 'B'

                return (
                  <ScoreRow
                    key={row}
                    rowKey={row}
                    playerLabel={playerLabels[row]}
                    cells={grid[row]}
                    teamCells={grid[teamRow]}
                    serverRowKey={serverRowKey}
                    serverScore={serverScore}
                    handIndex={handIndex}
                    isGameOver={isGameOver}
                    onToggleServeSide={onToggleServeSide}
                    maxCols={maxCols}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
