type GameOverConfirmationProps = {
  winnerTeam: string
  scoreA: number
  scoreB: number
  onCancel: () => void
  onConfirm: () => void
}

export const GameOverConfirmation = ({
  winnerTeam,
  scoreA,
  scoreB,
  onCancel,
  onConfirm,
}: GameOverConfirmationProps) => (
  <dialog className="modal modal-open">
    <div className="modal-box">
      <h3 className="font-bold text-lg">Game Over!</h3>
      <p className="py-4">
        <span className="text-2xl font-bold">{winnerTeam}</span> wins the game!
      </p>
      <p className="text-sm text-base-content/70">
        Final Score:{' '}
        {scoreA > scoreB ? `${scoreA}-${scoreB}` : `${scoreB}-${scoreA}`}
      </p>
      <p className="text-sm text-base-content/70 mt-2">
        Click Cancel to undo the last point and continue playing.
      </p>
      <div className="modal-action">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          Confirm Game Over
        </button>
      </div>
    </div>
  </dialog>
)
