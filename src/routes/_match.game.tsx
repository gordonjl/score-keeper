import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSelector } from '@xstate/react'
import { useEffect } from 'react'
import { MatchMachineContext } from '../contexts/MatchMachineContext'
import type { RowKey } from '../machines/squashMachine'

export const Route = createFileRoute('/_match/game')({
  component: GameRouteWrapper,
})

// Wrapper component that conditionally renders based on game actor existence
function GameRouteWrapper() {
  const navigate = useNavigate()
  const matchData = MatchMachineContext.useSelector((s) => ({
    currentGameActor: s.context.currentGameActor,
    games: s.context.games,
  }))
  
  const gameActor = matchData.currentGameActor
  
  // If no game actor, redirect to setup
  useEffect(() => {
    if (!gameActor) {
      navigate({ to: '/setup' })
    }
  }, [gameActor, navigate])
  
  // Conditionally render GameRoute only when actor exists
  if (!gameActor) {
    return <div className="p-4">Loading...</div>
  }
  
  return <GameRoute gameActor={gameActor} matchGames={matchData.games} />
}

// Main component that requires a game actor
function GameRoute({ gameActor, matchGames }: { gameActor: any; matchGames: Array<any> }) {
  const navigate = useNavigate()
  const matchActorRef = MatchMachineContext.useActorRef()
  
  // Subscribe to game actor state - actor is guaranteed to exist here
  const gameState = useSelector(gameActor, (s: any) => ({
    score: s.context.score,
    grid: s.context.grid,
    players: s.context.players,
    server: s.context.server,
    history: s.context.history,
    isGameOver: s.matches('gameOver'),
    isAwaitingConfirmation: s.matches('awaitingConfirmation'),
    isIdle: s.matches('idle'),
  }))
  const scoreA = gameState.score.A
  const scoreB = gameState.score.B
  const grid = gameState.grid
  const players = gameState.players
  const serverRowKey = `${gameState.server.team}${gameState.server.player}` as RowKey
  
  // Serve announcement
  const serverScore = gameState.score[gameState.server.team]
  const receiverTeam = gameState.server.team === 'A' ? 'B' : 'A'
  const receiverScore = gameState.score[receiverTeam]
  const toWords = (n: number) => {
    const words = ['Love', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen']
    return words[n] ?? String(n)
  }
  const scorePhrase = serverScore === receiverScore ? `${toWords(serverScore)} All` : `${toWords(serverScore)}–${toWords(receiverScore)}`
  const serverName = players[serverRowKey] || serverRowKey
  const sideName = gameState.server.side === 'R' ? 'Right' : 'Left'
  const announcement = `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  // Determine which team served first by checking column 0 of the grid
  // The team that has an entry in column 0 is the first-serving team
  const firstServingTeam = (grid.A1[0] || grid.A2[0]) ? 'A' : 'B'
  
  // Order rows: first-serving team on top
  const rows: Array<RowKey> = firstServingTeam === 'A' 
    ? ['A1', 'A2', 'B1', 'B2']
    : ['B1', 'B2', 'A1', 'A2']
  
  const maxCols = 16 // 0-15

  const renderCell = (row: RowKey, col: number) => {
    const cell = grid[row][col]
    const isCurrentServer = row === serverRowKey && col === scoreA && row.startsWith('A')
    const isCurrentServerB = row === serverRowKey && col === scoreB && row.startsWith('B')
    const isActive = isCurrentServer || isCurrentServerB
    
    // Cell is clickable only at hand-in (handIndex === 0 AND this is the first serve of the hand)
    // We check if the previous column is empty to determine if this is truly the first serve
    const serverTeam = gameState.server.team
    const prevCol = (serverTeam === 'A' ? scoreA : scoreB) - 1
    const isFirstServeOfHand = prevCol < 0 || !grid[serverRowKey][prevCol]
    const isClickable = isActive && gameState.server.handIndex === 0 && isFirstServeOfHand && !gameState.isGameOver

    // Check if this is a merged X cell
    const teamRow = row.startsWith('A') ? 'A' : 'B'
    const teamCell = grid[teamRow][col]
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
    if (isBottomOfTeam && grid[teamRow][col] === 'X') {
      return null
    }

    const handleClick = () => {
      if (isClickable) {
        gameActor.send({ type: 'TOGGLE_SERVE_SIDE' })
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

  // Display teams in order: first-serving team on left/top
  const topTeam = firstServingTeam === 'A' ? 'teamA' : 'teamB'
  const bottomTeam = firstServingTeam === 'A' ? 'teamB' : 'teamA'
  const topScore = firstServingTeam === 'A' ? scoreA : scoreB
  const bottomScore = firstServingTeam === 'A' ? scoreB : scoreA

  return (
    <div className="p-4 max-w-full mx-auto">
      {/* Header with team names and score */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">{players[topTeam]}</h1>
          <div className="text-3xl font-bold">{topScore}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-base-content/60">Game in Progress</div>
          <div className="text-2xl">-</div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">{players[bottomTeam]}</h1>
          <div className="text-3xl font-bold">{bottomScore}</div>
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
          </tbody>
        </table>
      </div>

      {/* Rally buttons - ordered by first-serving team */}
      <div className="flex gap-4 mb-4">
        <button
          className="btn btn-primary flex-1"
          onClick={() => gameActor.send({ type: 'RALLY_WON', winner: firstServingTeam })}
          disabled={gameState.isGameOver || gameState.isAwaitingConfirmation}
        >
          {firstServingTeam === 'A' 
            ? `${players.A1} & ${players.A2}` 
            : `${players.B1} & ${players.B2}`} Won Rally
        </button>
        <button
          className="btn btn-primary flex-1"
          onClick={() => gameActor.send({ type: 'RALLY_WON', winner: firstServingTeam === 'A' ? 'B' : 'A' })}
          disabled={gameState.isGameOver || gameState.isAwaitingConfirmation}
        >
          {firstServingTeam === 'A' 
            ? `${players.B1} & ${players.B2}` 
            : `${players.A1} & ${players.A2}`} Won Rally
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          className="btn btn-ghost"
          onClick={() => gameActor.send({ type: 'LET' })}
          disabled={gameState.isGameOver || gameState.isIdle || gameState.isAwaitingConfirmation}
        >
          Let
        </button>
        <button
          className="btn btn-warning"
          onClick={() => gameActor.send({ type: 'UNDO' })}
          disabled={gameState.history.length === 0}
        >
          Undo
        </button>
      </div>

      {/* Game Over Confirmation Dialog */}
      {gameState.isAwaitingConfirmation && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Game Over!</h3>
            <p className="py-4">
              <span className="text-2xl font-bold">
                {scoreA > scoreB ? players.teamA : players.teamB}
              </span>{' '}
              wins the game!
            </p>
            <p className="text-sm text-base-content/70">
              Final Score: {scoreA > scoreB ? `${scoreA}-${scoreB}` : `${scoreB}-${scoreA}`}
            </p>
            <p className="text-sm text-base-content/70 mt-2">
              Click Cancel to undo the last point and continue playing.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => gameActor.send({ type: 'UNDO' })}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  // Confirm game over and notify match machine
                  gameActor.send({ type: 'CONFIRM_GAME_OVER' })
                  const finalScore = { A: scoreA, B: scoreB }
                  const winner = scoreA > scoreB ? 'A' as const : 'B' as const
                  matchActorRef.send({ type: 'GAME_COMPLETED', winner, finalScore })
                }}
              >
                Confirm Game Over
              </button>
            </div>
          </div>
        </dialog>
      )}

      {gameState.isGameOver && (
        <div className="space-y-4 mt-4">
          <div className="alert alert-success">
            <span className="font-bold">
              Game #{matchGames.length} Complete! {scoreA > scoreB ? players.teamA : players.teamB} wins!
            </span>
          </div>
          
          {/* Match Summary */}
          {matchGames.length > 0 && (
            <div className="card bg-base-100 shadow p-4">
              <h3 className="font-bold mb-2">Match Summary</h3>
              <div className="space-y-1">
                {matchGames.map((game: any) => (
                  <div key={game.gameNumber} className="text-sm">
                    Game {game.gameNumber}: {game.winner === 'A' ? players.teamA : players.teamB} wins{' '}
                    ({game.finalScore.A}-{game.finalScore.B})
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Start New Game Button */}
          <div className="flex gap-2">
            <button
              className="btn btn-primary flex-1"
              onClick={() => {
                // Determine which team serves first for next game (alternate)
                const lastGame = matchGames[matchGames.length - 1]
                const nextServingTeam = lastGame.winner === 'A' ? 'B' as const : 'A' as const
                matchActorRef.send({ type: 'START_NEW_GAME', firstServingTeam: nextServingTeam })
              }}
            >
              Start Game #{matchGames.length + 1}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                matchActorRef.send({ type: 'END_MATCH' })
                navigate({ to: '/' })
              }}
            >
              End Match
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
