import { useQuery } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { gameById$ } from '../../livestore/squash-queries'
import type { ActorRefFrom } from 'xstate'
import type { Game, squashGameMachine } from '../../machines/squashGameMachine'

type GameOverConfirmationProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
  winnerTeam: string
  onCancel: () => void
  onConfirm: () => void
  onNextGame: () => void
  willCompleteMatch?: boolean
}

export const GameOverConfirmation = ({
  actorRef,
  winnerTeam,
  onCancel,
  onConfirm,
  onNextGame,
  willCompleteMatch = false,
}: GameOverConfirmationProps) => {
  // Get gameId from machine context
  const gameId = useSelector(actorRef, (s) => s.context.gameId)

  // Query game data from LiveStore (always call hooks)
  const game = useQuery(gameById$(gameId || '')) as Game | null

  // Get scores from LiveStore
  const scoreA = game?.scoreA ?? 0
  const scoreB = game?.scoreB ?? 0

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          {willCompleteMatch ? 'Match Over!' : 'Game Over!'}
        </h3>
        <p className="py-4">
          <span className="text-2xl font-bold">{winnerTeam}</span> win{' '}
          {willCompleteMatch ? 'the match!' : 'the game!'}
        </p>
        <p className="text-sm text-base-content/70">
          Final Score:{' '}
          {scoreA > scoreB ? `${scoreA}-${scoreB}` : `${scoreB}-${scoreA}`}
        </p>
        <p className="text-sm text-base-content/70 mt-2">
          Click Cancel to undo the last point and continue playing.
        </p>
        <div className="modal-action flex-col sm:flex-row gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          {willCompleteMatch ? (
            <button className="btn btn-primary" onClick={onConfirm}>
              View Match Summary
            </button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={onNextGame}>
                Next Game
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
