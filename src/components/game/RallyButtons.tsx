type RallyButtonsProps = {
  players: Record<string, string>
  isDisabled: boolean
  onRallyWon: (winner: 'A' | 'B') => void
}

export const RallyButtons = ({
  players,
  isDisabled,
  onRallyWon,
}: RallyButtonsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <button
        className="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl transition-all"
        onClick={() => onRallyWon('A')}
        disabled={isDisabled}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold">{`${players.A1} & ${players.A2}`}</span>
          <span className="text-xs opacity-80">Won Rally</span>
        </div>
      </button>
      <button
        className="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl transition-all"
        onClick={() => onRallyWon('B')}
        disabled={isDisabled}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold">{`${players.B1} & ${players.B2}`}</span>
          <span className="text-xs opacity-80">Won Rally</span>
        </div>
      </button>
    </div>
  )
}
