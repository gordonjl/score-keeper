type ActionButtonsProps = {
  canLet: boolean
  canUndo: boolean
  onLet: () => void
  onUndo: () => void
}

export const ActionButtons = ({
  canLet,
  canUndo,
  onLet,
  onUndo,
}: ActionButtonsProps) => (
  <div className="flex gap-3 flex-wrap">
    <button
      className="btn btn-outline btn-neutral shadow-md hover:shadow-lg transition-all"
      onClick={onLet}
      disabled={!canLet}
    >
      Let
    </button>
    <button
      className="btn btn-warning shadow-md hover:shadow-lg transition-all"
      onClick={onUndo}
      disabled={!canUndo}
    >
      Undo
    </button>
  </div>
)
