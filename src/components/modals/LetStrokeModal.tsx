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
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Let/Stroke Decision Helper</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <LetStrokeDecision />
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}
