import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Home, RotateCcw, Trophy } from 'lucide-react'
import { useEventSourcedMatch } from '../contexts/EventSourcedMatchContext'

export const Route = createFileRoute('/_match/summary')({
  component: MatchSummaryRoute,
})

function MatchSummaryRoute() {
  const navigate = useNavigate()
  const { actor: matchActorRef } = useEventSourcedMatch()

  const matchData = matchActorRef
    ? {
        games: matchActorRef.getSnapshot().context.games,
        players: matchActorRef.getSnapshot().context.players,
        isMatchComplete: matchActorRef.getSnapshot().matches('matchComplete'),
      }
    : null

  // Redirect if not in matchComplete state
  useEffect(() => {
    if (!matchData?.isMatchComplete) {
      navigate({ to: '/setup', search: {} })
    }
  }, [matchData?.isMatchComplete, navigate])

  if (!matchData || !matchData.isMatchComplete || !matchData.players) {
    return <div className="p-4">Loading...</div>
  }

  const gamesWonA = matchData.games.filter(
    (g) => g.status === 'completed' && g.winner === 'A',
  ).length
  const gamesWonB = matchData.games.filter(
    (g) => g.status === 'completed' && g.winner === 'B',
  ).length
  const matchWinner =
    gamesWonA >= 3 ? matchData.players.teamA : matchData.players.teamB
  const matchWinnerTeam = gamesWonA >= 3 ? 'A' : 'B'

  const handleStartNewMatch = () => {
    matchActorRef?.send({ type: 'RESET' })
    navigate({
      to: '/setup',
      search: {
        teamA: matchData.players.teamA,
        teamB: matchData.players.teamB,
        A1: matchData.players.A1.fullName,
        A2: matchData.players.A2.fullName,
        B2: matchData.players.B2.fullName,
      },
    })
  }

  const handleFinishAndExit = () => {
    // Match is automatically persisted in IndexedDB
    // Clear the active match ID to allow creating a new match
    localStorage.removeItem('squash-active-match-id')
    // Navigate to root
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-base-200 to-base-300 py-4 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Match Winner Banner */}
        <div className="alert alert-success shadow-xl">
          <div className="flex flex-col items-center w-full gap-2">
            <Trophy className="w-12 h-12" />
            <h1 className="text-2xl sm:text-3xl font-bold">Match Complete!</h1>
            <p className="text-xl sm:text-2xl">
              <span className="font-bold">{matchWinner}</span> win the match!
            </p>
            <p className="text-lg font-mono">
              {gamesWonA} - {gamesWonB}
            </p>
          </div>
        </div>

        {/* Match Summary Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-lg sm:text-xl mb-3">
              Match Summary
            </h2>

            {/* Games Won Overview */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                className={`stat bg-base-200 rounded-lg ${matchWinnerTeam === 'A' ? 'ring-2 ring-success' : ''}`}
              >
                <div className="stat-title">{matchData.players.teamA}</div>
                <div className="stat-value text-primary">{gamesWonA}</div>
                <div className="stat-desc">Games Won</div>
              </div>
              <div
                className={`stat bg-base-200 rounded-lg ${matchWinnerTeam === 'B' ? 'ring-2 ring-success' : ''}`}
              >
                <div className="stat-title">{matchData.players.teamB}</div>
                <div className="stat-value text-secondary">{gamesWonB}</div>
                <div className="stat-desc">Games Won</div>
              </div>
            </div>

            {/* Game-by-Game Results */}
            <div className="divider text-sm">Game Results</div>
            <div className="space-y-2">
              {matchData.games
                .filter((g) => g.status === 'completed')
                .map((game) => {
                  const gameWinner =
                    game.winner === 'A'
                      ? matchData.players.teamA
                      : matchData.players.teamB
                  const gameWinnerTeam = game.winner
                  return (
                    <div
                      key={game.gameNumber}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-base-200 rounded-lg gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="badge badge-neutral">
                          Game {game.gameNumber}
                        </div>
                        <div className="font-semibold text-sm">
                          {gameWinner} win
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs sm:text-sm">
                          <span
                            className={
                              gameWinnerTeam === 'A' ? 'font-bold' : ''
                            }
                          >
                            {matchData.players.teamA}
                          </span>{' '}
                          <span className="font-mono">{game.finalScore.A}</span>
                          {' - '}
                          <span className="font-mono">
                            {game.finalScore.B}
                          </span>{' '}
                          <span
                            className={
                              gameWinnerTeam === 'B' ? 'font-bold' : ''
                            }
                          >
                            {matchData.players.teamB}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Players */}
            <div className="divider text-sm">Players</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-base-200 p-3 rounded-lg">
                <h3 className="font-bold mb-2 text-sm">
                  {matchData.players.teamA}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{matchData.players.A1.fullName}</li>
                  <li>{matchData.players.A2.fullName}</li>
                </ul>
              </div>
              <div className="bg-base-200 p-3 rounded-lg">
                <h3 className="font-bold mb-2 text-sm">
                  {matchData.players.teamB}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{matchData.players.B1.fullName}</li>
                  <li>{matchData.players.B2.fullName}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="btn btn-primary flex-1 gap-2"
            onClick={handleStartNewMatch}
          >
            <RotateCcw className="w-4 h-4" />
            Start New Match (Same Teams)
          </button>
          <button
            className="btn btn-ghost flex-1 gap-2"
            onClick={handleFinishAndExit}
          >
            <Home className="w-4 h-4" />
            End Match
          </button>
        </div>
      </div>
    </div>
  )
}
