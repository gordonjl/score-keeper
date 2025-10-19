import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@livestore/react'
import { useEffect } from 'react'
import { Home, RotateCcw, Trophy } from 'lucide-react'
import { useLiveStoreMatch } from '../contexts/LiveStoreMatchContext'
import { gamesByMatch$, matchById$ } from '../livestore/squash-queries'

export const Route = createFileRoute('/match/$matchId/summary')({
  component: MatchSummaryRoute,
})

function MatchSummaryRoute() {
  const { matchId } = Route.useParams()
  const { actor: matchActorRef, isLoading } = useLiveStoreMatch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Query data from LiveStore
  const match = useQuery(matchById$(matchId))
  const games = useQuery(gamesByMatch$(matchId))

  // Build players from match data
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const players = match
    ? {
        A1: {
          firstName: match.playerA1FirstName,
          lastName: match.playerA1LastName,
          fullName:
            `${match.playerA1FirstName} ${match.playerA1LastName}`.trim(),
        },
        A2: {
          firstName: match.playerA2FirstName,
          lastName: match.playerA2LastName,
          fullName:
            `${match.playerA2FirstName} ${match.playerA2LastName}`.trim(),
        },
        B1: {
          firstName: match.playerB1FirstName,
          lastName: match.playerB1LastName,
          fullName:
            `${match.playerB1FirstName} ${match.playerB1LastName}`.trim(),
        },
        B2: {
          firstName: match.playerB2FirstName,
          lastName: match.playerB2LastName,
          fullName:
            `${match.playerB2FirstName} ${match.playerB2LastName}`.trim(),
        },
        teamA: `${match.playerA1FirstName} ${match.playerA1LastName} & ${match.playerA2FirstName} ${match.playerA2LastName}`,
        teamB: `${match.playerB1FirstName} ${match.playerB1LastName} & ${match.playerB2FirstName} ${match.playerB2LastName}`,
      }
    : null

  // Check if match is actually complete by counting wins
  const gamesWonA = games.filter(
    (g) => g.status === 'completed' && g.winner === 'A',
  ).length
  const gamesWonB = games.filter(
    (g) => g.status === 'completed' && g.winner === 'B',
  ).length
  const isActuallyComplete = gamesWonA >= 3 || gamesWonB >= 3

  // Redirect if match is not complete after loading completes
  useEffect(() => {
    if (!isLoading && !isActuallyComplete) {
      void navigate({ to: '/match/$matchId/setup', params: { matchId } })
    }
  }, [isLoading, isActuallyComplete, matchId, navigate])

  // Show loading while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Loading match...</p>
        </div>
      </div>
    )
  }

  if (!players || !isActuallyComplete) {
    return <div className="p-4">Loading...</div>
  }

  const matchWinner = gamesWonA >= 3 ? players.teamA : players.teamB
  const matchWinnerTeam = gamesWonA >= 3 ? 'A' : 'B'

  const handleStartNewMatch = () => {
    matchActorRef?.send({ type: 'RESET' })
    void navigate({
      to: '/match/$matchId/setup',
      params: { matchId },
      search: {
        teamA: players.teamA,
        teamB: players.teamB,
        A1: players.A1.fullName,
        A2: players.A2.fullName,
        B1: players.B1.fullName,
        B2: players.B2.fullName,
      },
    })
  }

  const handleFinishAndExit = () => {
    // Match is automatically persisted in IndexedDB
    // Navigate to root
    void navigate({ to: '/' })
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
                <div className="stat-title truncate">{players.teamA}</div>
                <div className="stat-value text-primary">{gamesWonA}</div>
                <div className="stat-desc">Games Won</div>
              </div>
              <div
                className={`stat bg-base-200 rounded-lg ${matchWinnerTeam === 'B' ? 'ring-2 ring-success' : ''}`}
              >
                <div className="stat-title truncate">{players.teamB}</div>
                <div className="stat-value text-secondary">{gamesWonB}</div>
                <div className="stat-desc">Games Won</div>
              </div>
            </div>

            {/* Game-by-Game Results */}
            <div className="divider text-sm">Game Results</div>
            <div className="space-y-2">
              {games
                .filter((g) => g.status === 'completed')
                .map((game) => {
                  const gameWinner =
                    game.winner === 'A' ? players.teamA : players.teamB
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
                            {players.teamA}
                          </span>{' '}
                          <span className="font-mono">{game.scoreA}</span>
                          {' - '}
                          <span className="font-mono">{game.scoreB}</span>{' '}
                          <span
                            className={
                              gameWinnerTeam === 'B' ? 'font-bold' : ''
                            }
                          >
                            {players.teamB}
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
                <h3 className="font-bold mb-2 text-sm">{players.teamA}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{players.A1.fullName}</li>
                  <li>{players.A2.fullName}</li>
                </ul>
              </div>
              <div className="bg-base-200 p-3 rounded-lg">
                <h3 className="font-bold mb-2 text-sm">{players.teamB}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{players.B1.fullName}</li>
                  <li>{players.B2.fullName}</li>
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
