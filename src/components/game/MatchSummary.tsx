import { useSelector } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import type { matchMachine } from '../../machines/matchMachine'

type MatchSummaryProps = {
  matchActorRef: ActorRefFrom<typeof matchMachine>
  currentWinner: string
  onStartNewGame: () => void
  onEndMatch: () => void
}

export const MatchSummary = ({
  matchActorRef,
  currentWinner,
  onStartNewGame,
  onEndMatch,
}: MatchSummaryProps) => {
  // Select all data this component needs from the match actor
  const { games, players } = useSelector(matchActorRef, (s) => ({
    games: s.context.games,
    players: s.context.players,
  }))

  // Compute derived values
  const currentGameNumber = games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) : 1
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
