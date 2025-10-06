import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Calendar, List, Play, Trophy, Users } from 'lucide-react'
import { Effect, pipe } from 'effect'
import { MatchManager } from '../db/matchManager'
import { StateReconstructor } from '../db/stateReconstructor'
import type { Match } from '../db/types'

export const Route = createFileRoute('/matches')({
  component: MatchesListRoute,
})

type MatchWithStatus = Match & {
  displayStatus: 'In Progress' | 'Complete' | 'Archived'
  latestGameNumber?: number
  actualPlayerNames?: ReadonlyArray<string>
}

function MatchesListRoute() {
  const [matches, setMatches] = useState<ReadonlyArray<MatchWithStatus>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMatches = async () => {
      const matchList = await pipe(
        MatchManager.listMatches(),
        Effect.runPromise,
      )

      console.log('Loaded matches:', matchList)

      // For each match, reconstruct state to get the latest game number
      const matchesWithStatus = await Promise.all(
        matchList.map(async (match): Promise<MatchWithStatus> => {
          const displayStatus =
            match.status === 'completed'
              ? 'Complete'
              : match.status === 'archived'
                ? 'Archived'
                : 'In Progress'

          // Get latest game number and actual player names by reconstructing state
          let latestGameNumber: number | undefined
          let actualPlayerNames: ReadonlyArray<string> | undefined

          try {
            const actor = await pipe(
              StateReconstructor.reconstructMatchState(match.id),
              Effect.runPromise,
            )
            const snapshot = actor.getSnapshot()
            const games = snapshot.context.games
            const players = snapshot.context.players

            console.log(
              'Match:',
              match.id,
              'Games:',
              games,
              'State:',
              snapshot.value,
              'Players:',
              players,
            )

            // Get highest game number from games array (now includes in-progress games)
            if (games.length > 0) {
              const gameNumbers = games.map((g) => g.gameNumber)
              latestGameNumber = Math.max(...gameNumbers)
            } else {
              latestGameNumber = undefined
            }

            console.log('Latest game number:', latestGameNumber)

            // Get actual player names from the machine context
            actualPlayerNames = [
              players.A1.fullName || 'Player 1',
              players.A2.fullName || 'Player 2',
              players.B1.fullName || 'Player 3',
              players.B2.fullName || 'Player 4',
            ]

            console.log(
              'Latest game number:',
              latestGameNumber,
              'Player names:',
              actualPlayerNames,
            )
            actor.stop()
          } catch (err) {
            // If reconstruction fails, we'll use defaults
            console.error('Failed to reconstruct match:', match.id, err)
            latestGameNumber = undefined
            actualPlayerNames = undefined
          }

          return {
            ...match,
            displayStatus,
            latestGameNumber,
            actualPlayerNames,
          }
        }),
      )

      setMatches(matchesWithStatus)
      setIsLoading(false)
    }

    loadMatches().catch((err) => {
      setError(String(err))
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Loading matches...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-full bg-gradient-to-br from-base-200 to-base-300 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <span>Error loading matches: {error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-base-200 to-base-300 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <List className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">All Matches</h1>
        </div>

        {/* Matches List */}
        {matches.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <Trophy className="w-16 h-16 text-base-300 mb-4" />
              <h2 className="card-title">No matches yet</h2>
              <p className="text-base-content/70">
                Start a new match to see it appear here
              </p>
              <Link to="/" className="btn btn-primary mt-4">
                Start New Match
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const isComplete = match.displayStatus === 'Complete'
              const isInProgress = match.displayStatus === 'In Progress'
              const createdDate = new Date(match.createdAt).toLocaleDateString()
              const updatedDate = new Date(match.updatedAt).toLocaleDateString()

              return (
                <div
                  key={match.id}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300"
                >
                  <div className="card-body">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        {/* Status Badge */}
                        <div className="mb-3">
                          <span
                            className={`badge ${
                              isComplete
                                ? 'badge-success'
                                : isInProgress
                                  ? 'badge-warning'
                                  : 'badge-ghost'
                            } badge-lg`}
                          >
                            {match.displayStatus}
                          </span>
                        </div>

                        {/* Players */}
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-base-content/70" />
                          <span className="text-sm font-semibold">
                            {(
                              match.actualPlayerNames || match.playerNames
                            ).join(', ')}
                          </span>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-2 text-xs text-base-content/70">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Created: {createdDate}
                            {createdDate !== updatedDate &&
                              ` • Updated: ${updatedDate}`}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex gap-2">
                        {(() => {
                          console.log(
                            'Rendering match:',
                            match.id,
                            'isInProgress:',
                            isInProgress,
                            'latestGameNumber:',
                            match.latestGameNumber,
                          )
                          return null
                        })()}
                        {isComplete ? (
                          <Link
                            to="/match/$matchId/summary"
                            params={{ matchId: match.id }}
                            className="btn btn-primary gap-2"
                          >
                            <Trophy className="w-4 h-4" />
                            View Summary
                          </Link>
                        ) : isInProgress && match.latestGameNumber ? (
                          <Link
                            to="/match/$matchId/game/$gameId"
                            params={{
                              matchId: match.id,
                              gameId: match.latestGameNumber.toString(),
                            }}
                            className="btn btn-primary gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Continue Match
                          </Link>
                        ) : isInProgress ? (
                          <Link
                            to="/match/$matchId/setup"
                            params={{ matchId: match.id }}
                            className="btn btn-primary gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Continue Match
                          </Link>
                        ) : (
                          <Link
                            to="/match/$matchId/setup"
                            params={{ matchId: match.id }}
                            className="btn btn-ghost gap-2"
                          >
                            View Match
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
