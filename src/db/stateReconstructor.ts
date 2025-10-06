import { Effect, pipe } from 'effect'
import { createActor } from 'xstate'
import { getCurrentGameId, matchMachine } from '../machines/matchMachine'
import { EventStore } from './eventStore'
import { StateReconstructionError } from './types'
import type { squashMachine } from '@/machines/squashMachine'
import type { ActorRefFrom, EventFromLogic, Snapshot } from 'xstate'
import type { MatchEvent, MatchId } from './types'

// Parse game event prefix (e.g., "GAME:game-1:RALLY_WON" -> { gameId: "game-1", type: "RALLY_WON" })
const parseGameEvent = (
  eventType: string,
): { gameId: string; type: string } | null => {
  const match = eventType.match(/^GAME:([^:]+):(.+)$/)
  if (!match) return null
  return { gameId: match[1], type: match[2] }
}

// XState event mapping - we trust the event payload structure
const mapEventToXState = (event: MatchEvent): unknown => ({
  type: event.type,
  ...(typeof event.payload === 'object' && event.payload !== null
    ? event.payload
    : {}),
})

// Apply single event to actor (match or game)
const applyEvent = (
  matchActor: ActorRefFrom<typeof matchMachine>,
  event: MatchEvent,
): Effect.Effect<void, StateReconstructionError> =>
  Effect.try({
    try: () => {
      const gameEvent = parseGameEvent(event.type)

      if (gameEvent) {
        // This is a game event - send to child actor
        const snapshot = matchActor.getSnapshot()
        const childActor = snapshot.children[gameEvent.gameId]

        if (childActor) {
          // Extract the original event from payload
          const xstateEvent =
            typeof event.payload === 'object' && event.payload !== null
              ? event.payload
              : { type: gameEvent.type }
          childActor.send(xstateEvent as EventFromLogic<typeof squashMachine>)
        } else {
          // Child actor doesn't exist - this is expected for completed games
          // Only log if it's for the current game (derived from state)
          const currentGameId = getCurrentGameId(snapshot)
          if (gameEvent.gameId === currentGameId) {
            console.warn(
              `Child actor ${gameEvent.gameId} not found for event ${event.type}`,
            )
          }
          // Skip events for old/completed games silently
        }
      } else {
        // This is a match event - send to match actor
        const xstateEvent = mapEventToXState(event)
        matchActor.send(xstateEvent as EventFromLogic<typeof matchMachine>)
      }
    },
    catch: (error) =>
      new StateReconstructionError({
        matchId: event.matchId,
        reason: `Failed to apply event ${event.type}: ${String(error)}`,
      }),
  })

// Apply events sequentially using Effect
const applyEvents = (
  actor: ActorRefFrom<typeof matchMachine>,
  events: ReadonlyArray<MatchEvent>,
): Effect.Effect<void, StateReconstructionError> =>
  pipe(
    events,
    Effect.forEach((event) => applyEvent(actor, event), {
      concurrency: 1,
      discard: true,
    }),
  )

// Reconstruct state from events (with optional snapshot optimization)
export const reconstructMatchState = (
  matchId: MatchId,
): Effect.Effect<ActorRefFrom<typeof matchMachine>, StateReconstructionError> =>
  pipe(
    EventStore.getLatestSnapshot(matchId),
    Effect.flatMap((snapshot) => {
      const fromSeq = snapshot ? snapshot.seq + 1 : 0

      const actor = snapshot
        ? createActor(matchMachine, {
            snapshot: snapshot.state as Snapshot<unknown>,
            input: { matchId }, // Always provide input
          })
        : createActor(matchMachine, {
            input: { matchId }, // Inject matchId via input
          })

      return pipe(
        Effect.sync(() => {
          actor.start()
          // If we restored from snapshot, inject matchId into context
          if (snapshot && actor.getSnapshot().context.matchId !== matchId) {
            // Update context with matchId
            const currentSnapshot = actor.getSnapshot()
            actor.send({
              type: 'xstate.snapshot',
              snapshot: {
                ...currentSnapshot,
                context: {
                  ...currentSnapshot.context,
                  matchId,
                },
              },
            } as any)
          }
          return actor
        }),
        Effect.flatMap((startedActor) =>
          pipe(
            EventStore.getEvents(matchId, fromSeq),
            Effect.flatMap((events) => applyEvents(startedActor, events)),
            Effect.map(() => startedActor),
          ),
        ),
      )
    }),
    Effect.catchAll((error) =>
      Effect.fail(
        new StateReconstructionError({
          matchId,
          reason: String(error),
        }),
      ),
    ),
  )

// Export as service
export const StateReconstructor = {
  reconstructMatchState,
} as const
