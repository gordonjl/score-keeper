import { Effect, Runtime } from 'effect'
import { useEffect, useState } from 'react'
import { EventStore } from '../db/eventStore'
import type { MatchEvent, MatchId } from '../db/types'

// Runtime for executing Effects in React
const runtime = Runtime.defaultRuntime

// Hook to get events for a match
export const useMatchEvents = (matchId: MatchId | null) => {
  const [events, setEvents] = useState<ReadonlyArray<MatchEvent>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId) {
      setEvents([])
      return
    }

    setIsLoading(true)
    setError(null)

    const program = EventStore.getEvents(matchId)

    const fiber = Effect.runFork(program)

    Runtime.runPromise(runtime)(
      Effect.matchEffect(program, {
        onFailure: (err) =>
          Effect.sync(() => {
            setError(String(err))
            setIsLoading(false)
          }),
        onSuccess: (result) =>
          Effect.sync(() => {
            setEvents(result)
            setIsLoading(false)
          }),
      }),
    )

    return () => {
      Effect.runFork(fiber.interruptAsFork(fiber.id()))
    }
  }, [matchId])

  return { events, isLoading, error }
}
