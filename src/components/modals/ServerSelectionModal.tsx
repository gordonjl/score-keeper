type ServerSelectionModalProps = {
  isOpen: boolean
  teamName: string
  player1Name: string
  player2Name: string
  onSelect: (playerNumber: 1 | 2) => void
}

export const ServerSelectionModal = ({
  isOpen,
  teamName,
  player1Name,
  player2Name,
  onSelect,
}: ServerSelectionModalProps) => {
  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md p-4 sm:p-6">
        <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">
          Select First Server
        </h3>
        <p className="text-sm mb-4">
          Who will serve first for{' '}
          <span className="font-semibold">{teamName}</span>?
        </p>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={() => onSelect(1)}
          >
            <span className="line-clamp-2 text-center">{player1Name}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={() => onSelect(2)}
          >
            <span className="line-clamp-2 text-center">{player2Name}</span>
          </button>
        </div>
      </div>
      {/* Backdrop - no onClick to make it blocking */}
      <div className="modal-backdrop" />
    </dialog>
  )
}
