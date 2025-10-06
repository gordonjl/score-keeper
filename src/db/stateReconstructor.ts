import { Effect, pipe } from 'effect'
import { createActor } from 'xstate'
import { matchMachine } from '../machines/matchMachine'
import { EventStore } from './eventStore'
import { StateReconstructionError } from './types'
import type { ActorRefFrom, Snapshot } from 'xstate'
import type { MatchEvent, MatchId } from './types'

// XState event mapping - we trust the event payload structure
const mapEventToXState = (event: MatchEvent): unknown => ({
  type: event.type,
  ...(typeof event.payload === 'object' && event.payload !== null
    ? event.payload
    : {}),
})

// Apply single event to actor
const applyEvent = (
  actor: ActorRefFrom<typeof matchMachine>,
  event: MatchEvent,
): Effect.Effect<void, StateReconstructionError> =>
  Effect.try({
    try: () => {
      const xstateEvent = mapEventToXState(event)
       
      actor.send(xstateEvent as any)
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
          })
        : createActor(matchMachine)

      return pipe(
        Effect.sync(() => {
          actor.start()
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
