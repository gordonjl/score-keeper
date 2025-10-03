import { createFileRoute } from '@tanstack/react-router'
import { SquashMachineContext } from '../contexts/SquashMachineContext'
import {
  useGrid,
  usePlayers,
  useScoreTuple,
  useServeAnnouncement,
  useServerRowKey,
  useServerSide,
} from '../hooks/useSquash'
import type { RowKey } from '../machines/squashMachine'

export const Route = createFileRoute('/game')({
  component: GameRoute,
})

function GameRoute() {
  const state = SquashMachineContext.useSelector((s) => s)
  const actorRef = SquashMachineContext.useActorRef()
  const [scoreA, scoreB] = useScoreTuple()
  const announcement = useServeAnnouncement()
  const grid = useGrid()
  const players = usePlayers()
  const serverRowKey = useServerRowKey()
  const serverSide = useServerSide()

  const rows: Array<RowKey> = ['A1', 'A2', 'B1', 'B2']
  const maxCols = 16 // 0-15

  const renderCell = (row: RowKey, col: number) => {
    const cell = grid[row][col]
    const isCurrentServer = row === serverRowKey && col === scoreA && row.startsWith('A')
    const isCurrentServerB = row === serverRowKey && col === scoreB && row.startsWith('B')
    const isActive = isCurrentServer || isCurrentServerB

    return (
      <td
        key={`${row}-${col}`}
        className={`border border-base-300 p-1 text-center text-sm min-w-[2rem] ${
          isActive ? 'bg-primary/20 font-bold' : ''
        }`}
      >
        {cell || ''}
      </td>
    )
  }

  return (
    <div className="p-4 max-w-full mx-auto">
      {/* Header with team names and score */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">{players.teamA}</h1>
          <div className="text-3xl font-bold">{scoreA}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-base-content/60">Game in Progress</div>
          <div className="text-2xl">-</div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">{players.teamB}</h1>
          <div className="text-3xl font-bold">{scoreB}</div>
        </div>
      </div>

      {/* Current serve announcement */}
      <div className="alert mb-4">
        <span className="font-medium">{announcement}</span>
      </div>

      {/* Score sheet grid */}
      <div className="card bg-base-100 shadow mb-4 overflow-x-auto">
        <table className="table-compact w-full">
          <thead>
            <tr>
              <th className="border border-base-300 p-1 text-center sticky left-0 bg-base-100 z-10">
                Player
              </th>
              {Array.from({ length: maxCols }, (_, i) => (
                <th key={i} className="border border-base-300 p-1 text-center text-xs">
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
                {Array.from({ length: maxCols }, (_, col) => renderCell(row, col))}
              </tr>
            ))}
            {/* Team A merged row for X marks */}
            <tr>
              <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-100 z-10">
                <span className="text-sm">Team A</span>
              </td>
              {Array.from({ length: maxCols }, (_, col) => (
                <td
                  key={`A-${col}`}
                  className="border border-base-300 p-1 text-center text-sm"
                >
                  {grid.A[col] || ''}
                </td>
              ))}
            </tr>
            {/* Team B merged row for X marks */}
            <tr>
              <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-100 z-10">
                <span className="text-sm">Team B</span>
              </td>
              {Array.from({ length: maxCols }, (_, col) => (
                <td
                  key={`B-${col}`}
                  className="border border-base-300 p-1 text-center text-sm"
                >
                  {grid.B[col] || ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rally buttons */}
      <div className="flex gap-4 mb-4">
        <button
          className="btn btn-primary flex-1"
          onClick={() => actorRef.send({ type: 'RALLY_WON', winner: 'A' })}
          disabled={state.matches('gameOver')}
        >
          {players.teamA} Won Rally
        </button>
        <button
          className="btn btn-primary flex-1"
          onClick={() => actorRef.send({ type: 'RALLY_WON', winner: 'B' })}
          disabled={state.matches('gameOver')}
        >
          {players.teamB} Won Rally
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          className="btn btn-ghost"
          onClick={() => actorRef.send({ type: 'LET' })}
          disabled={state.matches('gameOver') || state.matches('idle')}
        >
          Let
        </button>
        <button
          className="btn btn-warning"
          onClick={() => actorRef.send({ type: 'UNDO' })}
          disabled={state.context.history.length === 0}
        >
          Undo
        </button>
        <button
          className="btn btn-error"
          onClick={() => actorRef.send({ type: 'RESET' })}
        >
          Reset
        </button>
        <button
          className="btn btn-info"
          onClick={() => actorRef.send({ type: 'CLICK_ROW', row: serverRowKey })}
          disabled={state.matches('gameOver') || state.matches('idle')}
        >
          Write {serverSide}
        </button>
      </div>

      {state.matches('gameOver') && (
        <div className="alert alert-success mt-4">
          <span className="font-bold">
            Game Over! {scoreA > scoreB ? players.teamA : players.teamB} wins!
          </span>
        </div>
      )}
    </div>
  )
}
