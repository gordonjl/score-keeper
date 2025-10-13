import { useQuery } from '@livestore/react'
import { gameById$ } from '../../livestore/squash-queries'
import type { Game } from '../../machines/squashGameMachine'

type GameOverConfirmationProps = {
  gameId: string
  winnerTeam: string
  onCancel: () => void
  onConfirm: () => void
  onNextGame: () => void
  willCompleteMatch?: boolean
}

export const GameOverConfirmation = ({
  gameId,
  winnerTeam,
  onCancel,
  onConfirm,
  onNextGame,
  willCompleteMatch = false,
}: GameOverConfirmationProps) => {
  // Query game data from LiveStore
  const game = useQuery(gameById$(gameId)) as Game

  // Get scores from LiveStore
  const scoreA = game.scoreA
  const scoreB = game.scoreB

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
