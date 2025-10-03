type ScoreHeaderProps = {
  topTeam: string
  bottomTeam: string
  topScore: number
  bottomScore: number
  players: Record<string, string>
  currentGameNumber: number
  gamesWonA: number
  gamesWonB: number
}

export const ScoreHeader = ({
  topTeam,
  bottomTeam,
  topScore,
  bottomScore,
  players,
  currentGameNumber,
  gamesWonA,
  gamesWonB,
}: ScoreHeaderProps) => {
  const topTeamGamesWon = topTeam === 'teamA' ? gamesWonA : gamesWonB
  const bottomTeamGamesWon = topTeam === 'teamA' ? gamesWonB : gamesWonA

  return (
    <div className="flex justify-between items-center mb-4">
      <div>
        <h1 className="text-xl font-bold">{players[topTeam]}</h1>
        <div className="text-3xl font-bold">{topScore}</div>
        <div className="text-xs text-base-content/60 mt-1">
          {topTeamGamesWon} {topTeamGamesWon === 1 ? 'game' : 'games'} won
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm text-base-content/60">
          Game {currentGameNumber}
        </div>
        <div className="text-2xl">-</div>
      </div>
      <div className="text-right">
        <h1 className="text-xl font-bold">{players[bottomTeam]}</h1>
        <div className="text-3xl font-bold">{bottomScore}</div>
        <div className="text-xs text-base-content/60 mt-1">
          {bottomTeamGamesWon} {bottomTeamGamesWon === 1 ? 'game' : 'games'} won
        </div>
      </div>
    </div>
  )
}
