import { useQuery } from '@livestore/react'
import {
  gameById$,
  gamesByMatch$,
  matchById$,
} from '../../livestore/squash-queries'
import type { Game } from '../../machines/squashGameMachine'

type TeamKey = 'teamA' | 'teamB'

type ScoreHeaderProps = {
  gameId: string
  matchId: string
  firstServingTeam: 'A' | 'B'
}

export const ScoreHeader = ({
  gameId,
  matchId,
  firstServingTeam,
}: ScoreHeaderProps) => {
  // Query game and match data from LiveStore (only called when gameId is valid)
  const game = useQuery(gameById$(gameId)) as Game
  const match = useQuery(matchById$(matchId))
  const games = useQuery(gamesByMatch$(matchId))

  // Get scores from LiveStore
  const scoreA = game.scoreA
  const scoreB = game.scoreB

  // Build team names from match data
  const teamNames = {
    teamA: `${match.playerA1FirstName} & ${match.playerA2FirstName}`,
    teamB: `${match.playerB1FirstName} & ${match.playerB2FirstName}`,
  }

  // Compute derived values from games
  const currentGameNumber =
    games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) : 1
  const gamesWonA = games.filter(
    (g) => g.status === 'completed' && g.winner === 'A',
  ).length
  const gamesWonB = games.filter(
    (g) => g.status === 'completed' && g.winner === 'B',
  ).length

  // Compute display values based on first serving team
  const topTeam: TeamKey = firstServingTeam === 'A' ? 'teamA' : 'teamB'
  const bottomTeam: TeamKey = firstServingTeam === 'A' ? 'teamB' : 'teamA'
  const topScore = firstServingTeam === 'A' ? scoreA : scoreB
  const bottomScore = firstServingTeam === 'A' ? scoreB : scoreA

  const topTeamGamesWon = topTeam === 'teamA' ? gamesWonA : gamesWonB
  const bottomTeamGamesWon = topTeam === 'teamA' ? gamesWonB : gamesWonA

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
                {teamNames[topTeam]}
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
                {teamNames[bottomTeam]}
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
