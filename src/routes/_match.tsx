import { ClientOnly, Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { Effect, Runtime } from 'effect'
import { useEffect, useState } from 'react'
import { EventSourcedMatchProvider, useEventSourcedMatch } from '../contexts/EventSourcedMatchContext'
import { MatchManager } from '../db/matchManager'
import type { MatchId } from '../db/types'

export const Route = createFileRoute('/_match')({
  component: MatchLayout,
})

// Runtime for executing Effects
const runtime = Runtime.defaultRuntime

// Key for storing active match ID in localStorage
const ACTIVE_MATCH_ID_KEY = 'squash-active-match-id'

const MatchProviderClient = () => {
  const [matchId, setMatchId] = useState<MatchId | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try to get existing match ID from localStorage
    const storedMatchId = localStorage.getItem(ACTIVE_MATCH_ID_KEY)

    if (storedMatchId) {
      // Use existing match
      setMatchId(storedMatchId as MatchId)
      setIsInitializing(false)
    } else {
      // Create new match with default player names
      const program = MatchManager.createMatch([
        'Player 1',
        'Player 2',
        'Player 3',
        'Player 4',
      ])

      Runtime.runPromise(runtime)(
        Effect.matchEffect(program, {
          onFailure: (err) =>
            Effect.sync(() => {
              setError(`Failed to create match: ${String(err)}`)
              setIsInitializing(false)
            }),
          onSuccess: (newMatchId) =>
            Effect.sync(() => {
              localStorage.setItem(ACTIVE_MATCH_ID_KEY, newMatchId)
              setMatchId(newMatchId)
              setIsInitializing(false)
            }),
        }),
      )
    }
  }, [])

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Initializing match...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="alert alert-error max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!matchId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="alert alert-warning max-w-md">
          <span>No match ID available</span>
        </div>
      </div>
    )
  }

  return (
    <EventSourcedMatchProvider matchId={matchId}>
      <MatchNavigator />
    </EventSourcedMatchProvider>
  )
}

// Component that navigates based on match state after reconstruction
const MatchNavigator = () => {
  const { actor, isLoading } = useEventSourcedMatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [hasNavigated, setHasNavigated] = useState(false)

  useEffect(() => {
    // Only navigate once after loading completes
    if (isLoading || !actor || hasNavigated) return

    const state = actor.getSnapshot().value
    const currentPath = location.pathname

    // Determine correct route based on state
    let targetRoute: '/setup' | '/game' | '/summary' | null = null

    if (state === 'matchComplete') {
      targetRoute = '/summary'
    } else if (state === 'inGame' || state === 'gameComplete') {
      targetRoute = '/game'
    } else if (state === 'idle' || state === 'ready') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      targetRoute = '/setup'
    }

    // Navigate if we're not already on the correct route
    if (targetRoute && currentPath !== targetRoute) {
      setHasNavigated(true)
      navigate({ to: targetRoute })
    }
  }, [actor, isLoading, navigate, location.pathname, hasNavigated])

  return <Outlet />
}

function MatchLayout() {
  return (
    <ClientOnly fallback={null}>
      <MatchProviderClient />
    </ClientOnly>
  )
}
