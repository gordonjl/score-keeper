import { useQuery } from '@livestore/react'
import {
  gameById$,
  gamesByMatch$,
  matchById$,
} from '../../livestore/squash-queries'
import {
  getTeamNames,
  getTeamNamesAbbreviated,
  getTeamNamesCompact,
} from './match-utils'

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
  const game = useQuery(gameById$(gameId))
  const match = useQuery(matchById$(matchId))
  const games = useQuery(gamesByMatch$(matchId))

  // Get scores from LiveStore
  const scoreA = game.scoreA
  const scoreB = game.scoreB

  // Build team names from match data
  const teamNames = getTeamNames(match)
  const teamNamesAbbr = getTeamNamesAbbreviated(match)
  const teamNamesCompact = getTeamNamesCompact(match)

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
      <div className="card-body p-2 sm:p-3 md:p-4">
        <div className="flex justify-between items-center gap-1.5 sm:gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 min-w-0">
            <div
              className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl md:text-4xl font-bold transition-all bg-base-200 text-base-content flex-shrink-0`}
            >
              {topScore}
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-[10px] sm:text-xs md:text-sm lg:text-lg font-bold line-clamp-2 leading-tight"
                title={teamNames[topTeam]}
              >
                <span className="sm:hidden">{teamNamesCompact[topTeam]}</span>
                <span className="hidden sm:inline lg:hidden">
                  {teamNamesAbbr[topTeam]}
                </span>
                <span className="hidden lg:inline">{teamNames[topTeam]}</span>
              </h1>
              <div className="flex gap-1 mt-0.5 sm:mt-1">
                {Array.from({ length: topTeamGamesWon }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success"
                    title={`Game ${i + 1} won`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="text-center px-1 sm:px-2 flex-shrink-0">
            <div className="badge badge-primary badge-sm sm:badge-md md:badge-lg whitespace-nowrap">
              Game {currentGameNumber}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-row-reverse flex-1 min-w-0">
            <div
              className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl md:text-4xl font-bold transition-all bg-base-200 text-base-content flex-shrink-0`}
            >
              {bottomScore}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <h1
                className="text-[10px] sm:text-xs md:text-sm lg:text-lg font-bold line-clamp-2 leading-tight"
                title={teamNames[bottomTeam]}
              >
                <span className="sm:hidden">
                  {teamNamesCompact[bottomTeam]}
                </span>
                <span className="hidden sm:inline lg:hidden">
                  {teamNamesAbbr[bottomTeam]}
                </span>
                <span className="hidden lg:inline">
                  {teamNames[bottomTeam]}
                </span>
              </h1>
              <div className="flex gap-1 mt-0.5 sm:mt-1 justify-end">
                {Array.from({ length: bottomTeamGamesWon }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success"
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
