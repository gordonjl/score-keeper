type Game = {
  gameNumber: number
  winner: 'A' | 'B' | null
  finalScore: { A: number; B: number } | null
  status: 'in_progress' | 'completed'
}

type MatchSummaryProps = {
  games: Array<Game>
  players: Record<string, string>
  currentGameNumber: number
  currentWinner: string
  onStartNewGame: () => void
  onEndMatch: () => void
}

export const MatchSummary = ({
  games,
  players,
  currentGameNumber,
  currentWinner,
  onStartNewGame,
  onEndMatch,
}: MatchSummaryProps) => {
  // Filter to only show completed games
  const completedGames = games.filter(
    (game) => game.status === 'completed' && game.finalScore !== null,
  )

  return (
    <div className="space-y-4 mt-4">
      <div className="alert alert-success">
        <span className="font-bold">
          Game #{currentGameNumber} Complete! {currentWinner} win!
        </span>
      </div>

      {/* Match Summary */}
      {completedGames.length > 0 && (
        <div className="card bg-base-100 shadow p-4">
          <h3 className="font-bold mb-2">Match Summary</h3>
          <div className="space-y-1">
            {completedGames.map((game) => (
              <div key={game.gameNumber} className="text-sm">
                Game {game.gameNumber}:{' '}
                {game.winner === 'A' ? players.teamA : players.teamB} win (
                {game.finalScore!.A}-{game.finalScore!.B})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start New Game Button */}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={onStartNewGame}>
          Start Game #{currentGameNumber + 1}
        </button>
        <button className="btn btn-ghost" onClick={onEndMatch}>
          End Match
        </button>
      </div>
    </div>
  )
}
