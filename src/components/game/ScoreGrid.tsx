import { useMemo } from 'react'
import { useSelector } from '@xstate/react'
import { getOrderedRows } from './utils'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'
import type { RowKey } from '../../machines/squashMachine.types'

type ScoreGridProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
  firstServingTeam: 'A' | 'B'
  playerLabels: Record<string, string>
}

const MAX_COLS = 15

export const ScoreGrid = ({
  actorRef,
  firstServingTeam,
  playerLabels,
}: ScoreGridProps) => {
  // Use a single selector for all state this component needs
  const { grid, scoreA, scoreB, server, isGameOver } = useSelector(
    actorRef,
    (s) => ({
      grid: s.context.grid,
      scoreA: s.context.score.A,
      scoreB: s.context.score.B,
      server: s.context.server,
      isGameOver: s.status === 'done',
    }),
  )

  // Compute derived values
  const rows = useMemo(
    () => getOrderedRows(firstServingTeam),
    [firstServingTeam],
  )
  const serverRowKey = `${server.team}${server.player}` as RowKey
  const serverTeam = server.team
  const handIndex = server.handIndex

  const onToggleServeSide = () => {
    actorRef.send({ type: 'TOGGLE_SERVE_SIDE' })
  }
  const renderCell = (row: RowKey, col: number) => {
    const cell = grid[row][col]
    const isCurrentServer =
      row === serverRowKey && col === scoreA && row.startsWith('A')
    const isCurrentServerB =
      row === serverRowKey && col === scoreB && row.startsWith('B')
    const isActive = isCurrentServer || isCurrentServerB

    // Cell is clickable only at hand-in (handIndex === 0 AND this is the first serve of the hand)
    // We check if the previous column is empty to determine if this is truly the first serve
    const prevCol = (serverTeam === 'A' ? scoreA : scoreB) - 1
    const isFirstServeOfHand = prevCol < 0 || !grid[serverRowKey][prevCol]
    const isClickable =
      isActive && handIndex === 0 && isFirstServeOfHand && !isGameOver

    // Check if this is a merged X cell
    const teamRowKey = (row.startsWith('A') ? 'A' : 'B') as RowKey
    const teamCell = grid[teamRowKey][col]
    const isTopOfTeam = row === 'A1' || row === 'B1'
    const isBottomOfTeam = row === 'A2' || row === 'B2'

    // If top row has X, merge with bottom
    if (isTopOfTeam && teamCell === 'X') {
      return (
        <td
          key={`${row}-${col}`}
          rowSpan={2}
          className={`border border-base-300 p-0.5 sm:p-1 text-center text-xs sm:text-sm min-w-[28px] sm:min-w-[32px] ${
            isActive ? 'bg-primary/20 font-bold' : ''
          }`}
        >
          X
        </td>
      )
    }

    // If bottom row and top has X, skip rendering (already merged)
    if (isBottomOfTeam && grid[teamRowKey][col] === 'X') {
      return null
    }

    const handleClick = () => {
      if (isClickable) {
        onToggleServeSide()
      }
    }

    return (
      <td
        key={`${row}-${col}`}
        onClick={handleClick}
        className={`border border-base-300 p-0.5 sm:p-1 text-center text-xs sm:text-sm min-w-[28px] sm:min-w-[32px] ${
          isActive ? 'bg-primary/20 font-bold' : ''
        } ${isClickable ? 'cursor-pointer hover:bg-primary/40' : ''}`}
        title={isClickable ? 'Click to toggle R/L' : ''}
      >
        {cell || ''}
      </td>
    )
  }

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
                {Array.from({ length: MAX_COLS }, (_, i) => (
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
              {rows.map((row) => (
                <tr key={row}>
                  <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-200 z-10">
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs text-primary font-semibold">
                        {row}
                      </span>
                      <span className="text-xs sm:text-sm truncate max-w-[50px] sm:max-w-[70px]">
                        {playerLabels[row]}
                      </span>
                    </div>
                  </td>
                  {Array.from({ length: MAX_COLS }, (_, col) =>
                    renderCell(row, col),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
