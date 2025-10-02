import { createFileRoute } from '@tanstack/react-router'
import { SquashMachineContext } from '../contexts/SquashMachineContext'
import { useScoreTuple, useServeAnnouncement } from '../hooks/useSquash'

export const Route = createFileRoute('/game')({
  component: GameRoute,
})

function GameRoute() {
  const state = SquashMachineContext.useSelector((s) => s)
  const actorRef = SquashMachineContext.useActorRef()
  const [scoreA, scoreB] = useScoreTuple()
  const announcement = useServeAnnouncement()

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Game in Progress</h1>
      
      {/* Scoreboard */}
      <div className="card bg-base-100 shadow mb-4 p-6">
        <div className="flex justify-around items-center text-center">
          <div>
            <div className="text-sm text-base-content/60">{state.context.players.teamA}</div>
            <div className="text-5xl font-bold">{scoreA}</div>
          </div>
          <div className="text-2xl">-</div>
          <div>
            <div className="text-sm text-base-content/60">{state.context.players.teamB}</div>
            <div className="text-5xl font-bold">{scoreB}</div>
          </div>
        </div>
      </div>

      {/* Current call */}
      <div className="alert mb-4">
        <span className="font-medium">{announcement}</span>
      </div>

      {/* Rally buttons */}
      <div className="flex gap-4 mb-4">
        <button
          className="btn btn-primary flex-1"
          onClick={() => actorRef.send({ type: 'RALLY_WON', winner: 'A' })}
          disabled={state.matches('gameOver')}
        >
          Team A Won Rally
        </button>
        <button
          className="btn btn-primary flex-1"
          onClick={() => actorRef.send({ type: 'RALLY_WON', winner: 'B' })}
          disabled={state.matches('gameOver')}
        >
          Team B Won Rally
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
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
      </div>

      {state.matches('gameOver') && (
        <div className="alert alert-success mt-4">
          <span className="font-bold">Game Over!</span>
        </div>
      )}
    </div>
  )
}
