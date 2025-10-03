import type { RowKey } from '../../machines/squashMachine'

type ScoreGridProps = {
  rows: Array<RowKey>
  players: Record<string, string>
  grid: Record<RowKey, Array<string>>
  serverRowKey: RowKey
  scoreA: number
  scoreB: number
  serverTeam: 'A' | 'B'
  handIndex: number
  isGameOver: boolean
  onToggleServeSide: () => void
}

const MAX_COLS = 16

export const ScoreGrid = ({
  rows,
  players,
  grid,
  serverRowKey,
  scoreA,
  scoreB,
  serverTeam,
  handIndex,
  isGameOver,
  onToggleServeSide,
}: ScoreGridProps) => {
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
          className={`border border-base-300 p-1 text-center text-sm min-w-[2rem] ${
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
        className={`border border-base-300 p-1 text-center text-sm min-w-[2rem] ${
          isActive ? 'bg-primary/20 font-bold' : ''
        } ${isClickable ? 'cursor-pointer hover:bg-primary/40' : ''}`}
        title={isClickable ? 'Click to toggle R/L' : ''}
      >
        {cell || ''}
      </td>
    )
  }

  return (
    <div className="card bg-base-100 shadow mb-4 overflow-x-auto">
      <table className="table-compact w-full">
        <thead>
          <tr>
            <th className="border border-base-300 p-1 text-center sticky left-0 bg-base-100 z-10">
              Player
            </th>
            {Array.from({ length: MAX_COLS }, (_, i) => (
              <th
                key={i}
                className="border border-base-300 p-1 text-center text-xs"
              >
                {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-100 z-10">
                <div className="flex flex-col">
                  <span className="text-xs text-base-content/60">{row}</span>
                  <span className="text-sm">{players[row]}</span>
                </div>
              </td>
              {Array.from({ length: MAX_COLS }, (_, col) => renderCell(row, col))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
