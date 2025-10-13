import { useQuery } from '@livestore/react'
import { useLiveStoreMatch } from '../../contexts/LiveStoreMatchContext'
import { gamesByMatch$, matchById$ } from '../../livestore/squash-queries'

type MatchSummaryProps = {
  matchActorRef: unknown // Not used, kept for compatibility
  currentWinner: string
  onStartNewGame: () => void
  onEndMatch: () => void
}

export const MatchSummary = ({
  currentWinner,
  onStartNewGame,
  onEndMatch,
}: MatchSummaryProps) => {
  const { matchId } = useLiveStoreMatch()

  // Query from LiveStore
  const match = useQuery(matchById$(matchId))
  const games = useQuery(gamesByMatch$(matchId))

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const players = match
    ? {
        teamA: `${match.playerA1FirstName} ${match.playerA1LastName} & ${match.playerA2FirstName} ${match.playerA2LastName}`,
        teamB: `${match.playerB1FirstName} ${match.playerB1LastName} & ${match.playerB2FirstName} ${match.playerB2LastName}`,
      }
    : { teamA: 'Team A', teamB: 'Team B' }

  // Compute derived values
  const currentGameNumber =
    games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) : 1
  // Filter to only show completed games
  const completedGames = games.filter((game) => game.status === 'completed')

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
                {game.scoreA}-{game.scoreB})
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
