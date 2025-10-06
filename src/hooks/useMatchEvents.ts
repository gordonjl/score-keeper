import { Effect, Runtime } from 'effect'
import { useEffect, useState } from 'react'
import { EventStore } from '../db/eventStore'
import { MatchManager } from '../db/matchManager'
import type { Match, MatchEvent, MatchId } from '../db/types'

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

// Hook to list matches
export const useMatches = () => {
  const [matches, setMatches] = useState<ReadonlyArray<Match>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMatches = () => {
    setIsLoading(true)
    setError(null)

    const program = MatchManager.listMatches()

    Runtime.runPromise(runtime)(
      Effect.matchEffect(program, {
        onFailure: (err) =>
          Effect.sync(() => {
            setError(String(err))
            setIsLoading(false)
          }),
        onSuccess: (result) =>
          Effect.sync(() => {
            setMatches(result)
            setIsLoading(false)
          }),
      }),
    )
  }

  useEffect(() => {
    loadMatches()
  }, [])

  return { matches, isLoading, error, reload: loadMatches }
}

// Hook to create a match
export const useCreateMatch = () => {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createMatch = (playerNames: ReadonlyArray<string>) => {
    setIsCreating(true)
    setError(null)

    const program = MatchManager.createMatch(playerNames)

    return Runtime.runPromise(runtime)(
      Effect.matchEffect(program, {
        onFailure: (err) =>
          Effect.sync(() => {
            setError(String(err))
            setIsCreating(false)
            return null
          }),
        onSuccess: (matchId) =>
          Effect.sync(() => {
            setIsCreating(false)
            return matchId
          }),
      }),
    )
  }

  return { createMatch, isCreating, error }
}

// Hook to append an event
export const useAppendEvent = () => {
  const [isAppending, setIsAppending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appendEvent = (matchId: MatchId, type: string, payload: unknown) => {
    setIsAppending(true)
    setError(null)

    const program = EventStore.appendEvent(matchId, type, payload)

    return Runtime.runPromise(runtime)(
      Effect.matchEffect(program, {
        onFailure: (err) =>
          Effect.sync(() => {
            setError(String(err))
            setIsAppending(false)
            return null
          }),
        onSuccess: (event) =>
          Effect.sync(() => {
            setIsAppending(false)
            return event
          }),
      }),
    )
  }

  return { appendEvent, isAppending, error }
}
