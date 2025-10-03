type TeamKey = 'teamA' | 'teamB'

type ScoreHeaderProps = {
  topTeam: TeamKey
  bottomTeam: TeamKey
  topScore: number
  bottomScore: number
  players: Record<TeamKey, string>
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
    <div className="card bg-base-100 shadow-xl mb-3">
      <div className="card-body p-3 sm:p-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-sm sm:text-lg font-bold truncate">
              {players[topTeam]}
            </h1>
            <div className="text-2xl sm:text-4xl font-bold">{topScore}</div>
            <div className="text-[10px] sm:text-xs text-base-content/60 mt-1">
              {topTeamGamesWon} {topTeamGamesWon === 1 ? 'game' : 'games'} won
            </div>
          </div>
          <div className="text-center px-2">
            <div className="text-xs sm:text-sm text-base-content/60">
              Game {currentGameNumber}
            </div>
            <div className="text-xl sm:text-2xl">-</div>
          </div>
          <div className="text-right flex-1">
            <h1 className="text-sm sm:text-lg font-bold truncate">
              {players[bottomTeam]}
            </h1>
            <div className="text-2xl sm:text-4xl font-bold">{bottomScore}</div>
            <div className="text-[10px] sm:text-xs text-base-content/60 mt-1">
              {bottomTeamGamesWon} {bottomTeamGamesWon === 1 ? 'game' : 'games'}{' '}
              won
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
