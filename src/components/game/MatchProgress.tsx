import { useQuery } from '@livestore/react'
import { Clock, TrendingUp, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { gamesByMatch$, matchById$ } from '../../livestore/squash-queries'
import type { ActorRefFrom } from 'xstate'
import type { matchMachine } from '../../machines/matchMachine'

type MatchProgressProps = {
  matchActorRef: ActorRefFrom<typeof matchMachine>
  isGameInProgress: boolean
}

type Game = {
  readonly id: string
  readonly matchId: string
  readonly gameNumber: number
  readonly status: string
  readonly scoreA: number
  readonly scoreB: number
  readonly winner: 'A' | 'B' | null
  readonly maxPoints: number
  readonly winBy: number
  readonly createdAt: Date
  readonly completedAt: Date | null
  readonly firstServingTeam: string
  readonly firstServingPlayer: number
  readonly firstServingSide: string
}

const calculateMatchStats = (games: ReadonlyArray<Game>) => {
  // Filter to only completed games
  const completedGames = games.filter((g) => g.status === 'completed')

  if (completedGames.length === 0) {
    return {
      gamesWonA: 0,
      gamesWonB: 0,
      totalPoints: 0,
      longestGame: null as Game | null,
      closestGame: null as Game | null,
      currentStreak: { team: null as 'A' | 'B' | null, count: 0 },
    }
  }

  const gamesWonA = completedGames.filter((g) => g.winner === 'A').length
  const gamesWonB = completedGames.filter((g) => g.winner === 'B').length
  const totalPoints = completedGames.reduce(
    (sum, g) => sum + g.scoreA + g.scoreB,
    0,
  )

  const longestGame = completedGames.reduce(
    (longest, game) => {
      const points = game.scoreA + game.scoreB
      const longestPoints = longest ? longest.scoreA + longest.scoreB : 0
      return points > longestPoints ? game : longest
    },
    null as Game | null,
  )

  const closestGame = completedGames.reduce(
    (closest, game) => {
      const diff = Math.abs(game.scoreA - game.scoreB)
      const closestDiff = closest
        ? Math.abs(closest.scoreA - closest.scoreB)
        : Infinity
      return diff < closestDiff ? game : closest
    },
    null as Game | null,
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

export const MatchProgress = ({
  matchActorRef,
  isGameInProgress,
}: MatchProgressProps) => {
  // Get matchId from the actor context
  const matchId = matchActorRef.getSnapshot().context.matchId

  // Query match and games data from LiveStore
  const match = useQuery(matchById$(matchId))
  const games = useQuery(gamesByMatch$(matchId))

  // Build players object from match data
  const players = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!match) {
      return {
        teamA: 'Team A',
        teamB: 'Team B',
      }
    }
    return {
      teamA: `${match.playerA1FirstName} ${match.playerA1LastName} & ${match.playerA2FirstName} ${match.playerA2LastName}`,
      teamB: `${match.playerB1FirstName} ${match.playerB1LastName} & ${match.playerB2FirstName} ${match.playerB2LastName}`,
    }
  }, [match])

  // Compute derived values
  const currentGameNumber =
    games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) : 1
  const stats = calculateMatchStats(games as ReadonlyArray<Game>)

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
                  const isDominant = Math.abs(game.scoreA - game.scoreB) >= 10

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
                          {game.scoreA}-{game.scoreB}
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
                    {stats.longestGame.scoreA + stats.longestGame.scoreB} pts)
                  </span>
                </div>
              )}
              {stats.closestGame && (
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70">Closest Game</span>
                  <span className="font-semibold badge badge-ghost">
                    Game {stats.closestGame.gameNumber} (
                    {Math.abs(
                      stats.closestGame.scoreA - stats.closestGame.scoreB,
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
