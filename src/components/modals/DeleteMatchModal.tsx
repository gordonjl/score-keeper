import { AlertTriangle, X } from 'lucide-react'

type DeleteMatchModalProps = {
  readonly isOpen: boolean
  readonly teamAName: string
  readonly teamBName: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export const DeleteMatchModal = ({
  isOpen,
  teamAName,
  teamBName,
  onConfirm,
  onCancel,
}: DeleteMatchModalProps) => {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box p-4 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold mb-2">Delete Match?</h2>
            <p className="text-sm sm:text-base text-base-content/70 mb-3">
              Are you sure you want to delete this match? This action cannot be
              undone.
            </p>
            <div className="bg-base-300 p-2 sm:p-3 rounded-lg">
              <div
                className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight"
                title={teamAName}
              >
                {teamAName}
              </div>
              <div className="text-[10px] sm:text-xs text-base-content/50">
                vs
              </div>
              <div
                className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight"
                title={teamBName}
              >
                {teamBName}
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-circle btn-xs sm:btn-sm flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="modal-action gap-2">
          <button onClick={onCancel} className="btn btn-ghost btn-sm sm:btn-md">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-error btn-sm sm:btn-md"
          >
            Delete Match
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel} />
    </div>
  )
}
