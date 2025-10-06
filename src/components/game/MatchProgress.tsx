import { Clock, TrendingUp, Trophy } from 'lucide-react'
import type { GameResult } from '../../machines/matchMachine'

type MatchProgressProps = {
  games: Array<GameResult>
  currentGameNumber: number
  players: { teamA: string; teamB: string }
  matchStartTime?: number
  isGameInProgress: boolean
}

const calculateMatchStats = (games: Array<GameResult>) => {
  // Filter to only completed games
  const completedGames = games.filter((g) => g.status === 'completed')

  if (completedGames.length === 0) {
    return {
      gamesWonA: 0,
      gamesWonB: 0,
      totalPoints: 0,
      longestGame: null as GameResult | null,
      closestGame: null as GameResult | null,
      currentStreak: { team: null as 'A' | 'B' | null, count: 0 },
    }
  }

  const gamesWonA = completedGames.filter((g) => g.winner === 'A').length
  const gamesWonB = completedGames.filter((g) => g.winner === 'B').length
  const totalPoints = completedGames.reduce(
    (sum, g) => sum + g.finalScore!.A + g.finalScore!.B,
    0,
  )

  const longestGame = completedGames.reduce(
    (longest, game) => {
      const points = game.finalScore!.A + game.finalScore!.B
      const longestPoints = longest
        ? longest.finalScore!.A + longest.finalScore!.B
        : 0
      return points > longestPoints ? game : longest
    },
    null as GameResult | null,
  )

  const closestGame = completedGames.reduce(
    (closest, game) => {
      const diff = Math.abs(game.finalScore!.A - game.finalScore!.B)
      const closestDiff = closest
        ? Math.abs(closest.finalScore!.A - closest.finalScore!.B)
        : Infinity
      return diff < closestDiff ? game : closest
    },
    null as GameResult | null,
  )

  // Calculate current streak
  let currentStreak = { team: null as 'A' | 'B' | null, count: 0 }
  if (completedGames.length > 0) {
    const lastWinner = completedGames[completedGames.length - 1].winner
    let count = 0
    for (let i = completedGames.length - 1; i >= 0; i--) {
      if (completedGames[i].winner === lastWinner) {
        count++
      } else {
        break
      }
    }
    currentStreak = { team: lastWinner!, count }
  }

  return {
    gamesWonA,
    gamesWonB,
    totalPoints,
    longestGame,
    closestGame,
    currentStreak,
  }
}

const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes}m ${seconds % 60}s`
}

export const MatchProgress = ({
  games,
  currentGameNumber,
  players,
  matchStartTime,
  isGameInProgress,
}: MatchProgressProps) => {
  const stats = calculateMatchStats(games)
  const duration = matchStartTime ? Date.now() - matchStartTime : 0

  return (
    <div className="space-y-4">
      {/* Match Score */}
      <div className="card bg-base-200 shadow-lg border border-base-300">
        <div className="card-body p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Match Score
          </h3>
          <div className="flex justify-between items-center gap-4">
            <div className="text-center flex-1">
              <div className="text-sm text-base-content/70 mb-2">
                {players.teamA}
              </div>
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary">
                <div className="text-3xl font-bold text-primary">
                  {stats.gamesWonA}
                </div>
              </div>
            </div>
            <div className="text-2xl text-base-content/50">-</div>
            <div className="text-center flex-1">
              <div className="text-sm text-base-content/70 mb-2">
                {players.teamB}
              </div>
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary">
                <div className="text-3xl font-bold text-primary">
                  {stats.gamesWonB}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Game Indicator */}
      <div className="card bg-primary text-primary-content shadow-lg">
        <div className="card-body p-4">
          <div className="text-center">
            <div className="text-sm opacity-90">
              {isGameInProgress ? 'Currently Playing' : 'Next Game'}
            </div>
            <div className="text-2xl font-bold">Game {currentGameNumber}</div>
          </div>
        </div>
      </div>

      {/* Game History */}
      {games.length > 0 && (
        <div className="card bg-base-200 shadow-lg border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-bold mb-3">Game History</h3>
            <div className="space-y-2">
              {games
                .filter((g) => g.status === 'completed')
                .map((game) => {
                  const winnerName =
                    game.winner === 'A' ? players.teamA : players.teamB
                  const isDominant =
                    Math.abs(game.finalScore!.A - game.finalScore!.B) >= 10

                  return (
                    <div
                      key={game.gameNumber}
                      className="flex items-center justify-between p-3 bg-base-100 rounded-lg shadow-sm border border-base-300"
                    >
                      <div className="flex items-center gap-2">
                        <div className="badge badge-primary badge-sm">
                          Game {game.gameNumber}
                        </div>
                        <Trophy
                          className={`w-4 h-4 ${
                            game.winner === 'A' ? 'text-success' : 'text-accent'
                          }`}
                        />
                        <span className="font-medium text-sm">
                          {winnerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {game.finalScore!.A}-{game.finalScore!.B}
                        </span>
                        {isDominant && (
                          <TrendingUp className="w-3 h-3 text-warning" />
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Match Statistics */}
      {games.length > 0 && (
        <div className="card bg-base-200 shadow-lg border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Match Stats
            </h3>
            <div className="space-y-3 text-sm">
              {matchStartTime && (
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70">Duration</span>
                  <span className="font-semibold badge badge-ghost">
                    {formatDuration(duration)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                <span className="text-base-content/70">Total Points</span>
                <span className="font-semibold badge badge-ghost">
                  {stats.totalPoints}
                </span>
              </div>
              {stats.longestGame && (
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70">Longest Game</span>
                  <span className="font-semibold badge badge-ghost">
                    Game {stats.longestGame.gameNumber} (
                    {stats.longestGame.finalScore!.A +
                      stats.longestGame.finalScore!.B}{' '}
                    pts)
                  </span>
                </div>
              )}
              {stats.closestGame && (
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70">Closest Game</span>
                  <span className="font-semibold badge badge-ghost">
                    Game {stats.closestGame.gameNumber} (
                    {Math.abs(
                      stats.closestGame.finalScore!.A -
                        stats.closestGame.finalScore!.B,
                    )}{' '}
                    pt diff)
                  </span>
                </div>
              )}
              {stats.currentStreak.count > 1 && stats.currentStreak.team && (
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg gap-2">
                  <span className="text-base-content/70 flex-shrink-0">
                    Current Streak
                  </span>
                  <span className="font-semibold badge badge-warning whitespace-nowrap overflow-hidden text-ellipsis">
                    {stats.currentStreak.team === 'A'
                      ? players.teamA
                      : players.teamB}{' '}
                    ({stats.currentStreak.count} games)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
