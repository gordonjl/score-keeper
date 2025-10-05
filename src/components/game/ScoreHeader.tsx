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
  const isTopWinning = topScore > bottomScore
  const isBottomWinning = bottomScore > topScore

  return (
    <div className="card bg-base-100 shadow-xl mb-3 border border-base-300">
      <div className="card-body p-3 sm:p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex items-center gap-3">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-4xl font-bold transition-all bg-base-200 text-base-content`}
            >
              {topScore}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold truncate">
                {players[topTeam]}
              </h1>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: topTeamGamesWon }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-success"
                    title={`Game ${i + 1} won`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="text-center px-2 flex-shrink-0">
            <div className="badge badge-primary badge-lg">
              Game {currentGameNumber}
            </div>
          </div>

          <div className="flex-1 flex items-center gap-3 flex-row-reverse">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-4xl font-bold transition-all bg-base-200 text-base-content`}
            >
              {bottomScore}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <h1 className="text-sm sm:text-lg font-bold truncate">
                {players[bottomTeam]}
              </h1>
              <div className="flex gap-1 mt-1 justify-end">
                {Array.from({ length: bottomTeamGamesWon }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-success"
                    title={`Game ${i + 1} won`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
