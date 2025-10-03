import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { MatchMachineContext } from '../contexts/MatchMachineContext'

export const Route = createFileRoute('/_match/summary')({
  component: MatchSummaryRoute,
})

function MatchSummaryRoute() {
  const navigate = useNavigate()
  const matchActorRef = MatchMachineContext.useActorRef()
  const matchData = MatchMachineContext.useSelector((s) => ({
    games: s.context.games,
    players: s.context.players,
    isMatchComplete: s.matches('matchComplete'),
  }))

  // Redirect if not in matchComplete state
  useEffect(() => {
    if (!matchData.isMatchComplete) {
      navigate({ to: '/setup', search: {} })
    }
  }, [matchData.isMatchComplete, navigate])

  if (!matchData.isMatchComplete) {
    return <div className="p-4">Loading...</div>
  }

  const gamesWonA = matchData.games.filter((g) => g.winner === 'A').length
  const gamesWonB = matchData.games.filter((g) => g.winner === 'B').length
  const matchWinner =
    gamesWonA >= 3 ? matchData.players.teamA : matchData.players.teamB
  const matchWinnerTeam = gamesWonA >= 3 ? 'A' : 'B'

  const handleStartNewMatch = () => {
    matchActorRef.send({ type: 'RESET' })
    navigate({
      to: '/setup',
      search: {
        teamA: matchData.players.teamA,
        teamB: matchData.players.teamB,
        A1: matchData.players.A1,
        A2: matchData.players.A2,
        B1: matchData.players.B1,
        B2: matchData.players.B2,
      },
    })
  }

  const handleEndMatch = () => {
    // Navigate to root - this exits the _match layout and destroys the match machine
    navigate({ to: '/' })
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Match Winner Banner */}
        <div className="alert alert-success shadow-lg">
          <div className="flex flex-col items-center w-full">
            <h1 className="text-3xl font-bold mb-2">Match Complete!</h1>
            <p className="text-2xl">
              <span className="font-bold">{matchWinner}</span> win the match!
            </p>
            <p className="text-lg mt-2">
              {gamesWonA} - {gamesWonB}
            </p>
          </div>
        </div>

        {/* Match Summary Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Match Summary</h2>

            {/* Games Won Overview */}
            <div className="grid grid-cols-2 gap-4 mb-6">
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
            <div className="divider">Game Results</div>
            <div className="space-y-3">
              {matchData.games.map((game) => {
                const gameWinner =
                  game.winner === 'A'
                    ? matchData.players.teamA
                    : matchData.players.teamB
                const gameWinnerTeam = game.winner
                return (
                  <div
                    key={game.gameNumber}
                    className="flex items-center justify-between p-4 bg-base-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="badge badge-lg badge-neutral">
                        Game {game.gameNumber}
                      </div>
                      <div className="font-semibold">{gameWinner} win</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span
                          className={gameWinnerTeam === 'A' ? 'font-bold' : ''}
                        >
                          {matchData.players.teamA}
                        </span>{' '}
                        <span className="font-mono">{game.finalScore.A}</span>
                        {' - '}
                        <span className="font-mono">
                          {game.finalScore.B}
                        </span>{' '}
                        <span
                          className={gameWinnerTeam === 'B' ? 'font-bold' : ''}
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
            <div className="divider">Players</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-base-200 p-4 rounded-lg">
                <h3 className="font-bold mb-2">{matchData.players.teamA}</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>{matchData.players.A1}</li>
                  <li>{matchData.players.A2}</li>
                </ul>
              </div>
              <div className="bg-base-200 p-4 rounded-lg">
                <h3 className="font-bold mb-2">{matchData.players.teamB}</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>{matchData.players.B1}</li>
                  <li>{matchData.players.B2}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            className="btn btn-primary flex-1"
            onClick={handleStartNewMatch}
          >
            Start New Match (Same Teams)
          </button>
          <button className="btn btn-ghost flex-1" onClick={handleEndMatch}>
            End Match
          </button>
        </div>
      </div>
    </div>
  )
}
