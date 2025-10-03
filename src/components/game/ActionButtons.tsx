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
  <div className="flex gap-2 flex-wrap">
    <button className="btn btn-ghost" onClick={onLet} disabled={!canLet}>
      Let
    </button>
    <button className="btn btn-warning" onClick={onUndo} disabled={!canUndo}>
      Undo
    </button>
  </div>
)
