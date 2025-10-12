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
      <div className="modal-box">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-error" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Delete Match?</h2>
            <p className="text-base-content/70 mb-3">
              Are you sure you want to delete this match? This action cannot be
              undone.
            </p>
            <div className="bg-base-300 p-3 rounded-lg">
              <div className="text-sm font-medium">{teamAName}</div>
              <div className="text-xs text-base-content/50">vs</div>
              <div className="text-sm font-medium">{teamBName}</div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-action">
          <button onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-error">
            Delete Match
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel} />
    </div>
  )
}
