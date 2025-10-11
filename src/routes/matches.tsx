import { Link, createFileRoute } from '@tanstack/react-router'
import { useStore } from '@livestore/react'
import { Calendar, Play } from 'lucide-react'
import { allMatches$ } from '../livestore/squash-queries'

export const Route = createFileRoute('/matches')({
  component: MatchesListRoute,
})

function MatchesListRoute() {
  const { store } = useStore()
  const matches = store.useQuery(allMatches$)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!matches || matches.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Match History</h1>
          <Link to="/" className="btn btn-primary">
            <Play className="w-4 h-4 mr-2" />
            New Match
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-base-content/60">
            No matches found. Start a new match to get started!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Match History</h1>
        <Link to="/" className="btn btn-primary">
          <Play className="w-4 h-4 mr-2" />
          New Match
        </Link>
      </div>

      <div className="grid gap-4">
        {matches.map((match) => (
          <Link
            key={match.id}
            to="/match/$matchId/summary"
            params={{ matchId: match.id }}
            className="card bg-base-200 hover:bg-base-300 transition-colors"
          >
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="card-title text-lg mb-2">
                    {match.playerA1FirstName && match.playerA1LastName
                      ? `${match.playerA1FirstName} ${match.playerA1LastName} & ${match.playerA2FirstName} ${match.playerA2LastName}`
                      : 'Match'}
                  </h2>
                  <p className="text-sm text-base-content/60">
                    vs {match.playerB1FirstName} {match.playerB1LastName} &{' '}
                    {match.playerB2FirstName} {match.playerB2LastName}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-base-content/60">
                    <Calendar className="w-4 h-4" />
                    {new Date(match.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
