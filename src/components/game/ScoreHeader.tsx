type ScoreHeaderProps = {
  topTeam: string
  bottomTeam: string
  topScore: number
  bottomScore: number
  players: Record<string, string>
}

export const ScoreHeader = ({
  topTeam,
  bottomTeam,
  topScore,
  bottomScore,
  players,
}: ScoreHeaderProps) => (
  <div className="flex justify-between items-center mb-4">
    <div>
      <h1 className="text-xl font-bold">{players[topTeam]}</h1>
      <div className="text-3xl font-bold">{topScore}</div>
    </div>
    <div className="text-center">
      <div className="text-sm text-base-content/60">Game in Progress</div>
      <div className="text-2xl">-</div>
    </div>
    <div className="text-right">
      <h1 className="text-xl font-bold">{players[bottomTeam]}</h1>
      <div className="text-3xl font-bold">{bottomScore}</div>
    </div>
  </div>
)
