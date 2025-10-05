import { X } from 'lucide-react'
import { Timers } from '../support/Timers'
import { ConductWarnings } from '../support/ConductWarnings'

type TimersModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const TimersModal = ({ isOpen, onClose }: TimersModalProps) => {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Match Timers & Conduct</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-8">
          <Timers />
          <ConductWarnings />
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}
