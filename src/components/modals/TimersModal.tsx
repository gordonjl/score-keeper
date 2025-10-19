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
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-between items-center gap-2 mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
            Match Timers & Conduct
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-xs sm:btn-sm flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          <Timers />
          <ConductWarnings />
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}
