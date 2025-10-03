type RallyButtonsProps = {
  firstServingTeam: 'A' | 'B'
  players: Record<string, string>
  isDisabled: boolean
  onRallyWon: (winner: 'A' | 'B') => void
}

export const RallyButtons = ({
  firstServingTeam,
  players,
  isDisabled,
  onRallyWon,
}: RallyButtonsProps) => {
  const otherTeam = firstServingTeam === 'A' ? 'B' : 'A'

  return (
    <div className="flex gap-4 mb-4">
      <button
        className="btn btn-primary flex-1"
        onClick={() => onRallyWon(firstServingTeam)}
        disabled={isDisabled}
      >
        {firstServingTeam === 'A'
          ? `${players.A1} & ${players.A2}`
          : `${players.B1} & ${players.B2}`}{' '}
        Won Rally
      </button>
      <button
        className="btn btn-primary flex-1"
        onClick={() => onRallyWon(otherTeam)}
        disabled={isDisabled}
      >
        {firstServingTeam === 'A'
          ? `${players.B1} & ${players.B2}`
          : `${players.A1} & ${players.A2}`}{' '}
        Won Rally
      </button>
    </div>
  )
}
