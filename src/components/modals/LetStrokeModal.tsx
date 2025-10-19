import { X } from 'lucide-react'
import { LetStrokeDecision } from '../support/LetStrokeDecision'

type LetStrokeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const LetStrokeModal = ({ isOpen, onClose }: LetStrokeModalProps) => {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl p-4 sm:p-6">
        <div className="flex justify-between items-center gap-2 mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
            Let/Stroke Decision Helper
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-xs sm:btn-sm flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <LetStrokeDecision />
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}
