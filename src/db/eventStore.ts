import { Effect, pipe } from 'effect'
import { v4 as uuidv4 } from 'uuid'
import { db } from './schema'
import { DatabaseError, EventAppendError, MatchNotFoundError } from './types'
import type {
  DeviceId,
  EventId,
  Match,
  MatchEvent,
  MatchId,
  MatchSnapshot,
  SnapshotId,
} from './types'

// Device ID management
const DEVICE_ID_KEY = 'squash-device-id'

const getOrCreateDeviceId = (): Effect.Effect<DeviceId, DatabaseError> =>
  Effect.try({
    try: () => {
      const stored = localStorage.getItem(DEVICE_ID_KEY)
      if (stored) {
        return stored as DeviceId
      }
      const newId = uuidv4() as DeviceId
      localStorage.setItem(DEVICE_ID_KEY, newId)
      return newId
    },
    catch: (error) =>
      new DatabaseError({
        operation: 'getOrCreateDeviceId',
        reason: String(error),
      }),
  })

// Get match by ID
const getMatch = (
  matchId: MatchId,
): Effect.Effect<Match, MatchNotFoundError | DatabaseError> =>
  Effect.tryPromise({
    try: () => db.matches.get(matchId),
    catch: (error) =>
      new DatabaseError({
        operation: 'getMatch',
        reason: String(error),
      }),
  }).pipe(
    Effect.flatMap((match) =>
      match
        ? Effect.succeed(match)
        : Effect.fail(new MatchNotFoundError({ matchId })),
    ),
  )

// Append event to log (idempotent)
export const appendEvent = (
  matchId: MatchId,
  type: string,
  payload: unknown,
): Effect.Effect<
  MatchEvent,
  EventAppendError | MatchNotFoundError | DatabaseError
> =>
  pipe(
    Effect.all([getMatch(matchId), getOrCreateDeviceId()]),
    Effect.flatMap(([match, deviceId]) => {
      const seq = match.currentSeq + 1
      const event: MatchEvent = {
        id: uuidv4() as EventId,
        matchId,
        seq,
        ts: Date.now(),
        source: deviceId,
        type,
        payload,
        version: 1,
      }

      return Effect.tryPromise({
        try: () =>
          db.transaction('rw', [db.events, db.matches], async () => {
            await db.events.add(event)
            await db.matches.update(matchId, {
              currentSeq: seq,
              updatedAt: event.ts,
            })
            return event
          }),
        catch: (error) =>
          new EventAppendError({
            matchId,
            reason: String(error),
          }),
      })
    }),
  )

// Retrieve events for a match (with optional range)
export const getEvents = (
  matchId: MatchId,
  fromSeq = 0,
  toSeq?: number,
): Effect.Effect<ReadonlyArray<MatchEvent>, DatabaseError> =>
  Effect.tryPromise({
    try: () =>
      db.events
        .where('[matchId+seq]')
        .between([matchId, fromSeq], [matchId, toSeq ?? Infinity])
        .toArray(),
    catch: (error) =>
      new DatabaseError({
        operation: 'getEvents',
        reason: String(error),
      }),
  })

// Get latest snapshot for match
export const getLatestSnapshot = (
  matchId: MatchId,
): Effect.Effect<MatchSnapshot | null, DatabaseError> =>
  Effect.tryPromise({
    try: async () => {
      const snapshot = await db.snapshots
        .where('matchId')
        .equals(matchId)
        .reverse()
        .first()
      return snapshot ?? null
    },
    catch: (error) =>
      new DatabaseError({
        operation: 'getLatestSnapshot',
        reason: String(error),
      }),
  })

// Prune old snapshots (keep last N)
const pruneOldSnapshots = (
  matchId: MatchId,
  keepCount: number,
): Effect.Effect<void, DatabaseError> =>
  Effect.tryPromise({
    try: async () => {
      const snapshots = await db.snapshots
        .where('matchId')
        .equals(matchId)
        .reverse()
        .toArray()

      if (snapshots.length > keepCount) {
        const toDelete = snapshots.slice(keepCount)
        await db.snapshots.bulkDelete(toDelete.map((s) => s.id))
      }
    },
    catch: (error) =>
      new DatabaseError({
        operation: 'pruneOldSnapshots',
        reason: String(error),
      }),
  })

// Create snapshot (compaction)
export const createSnapshot = (
  matchId: MatchId,
  state: unknown,
  seq: number,
): Effect.Effect<void, DatabaseError> =>
  pipe(
    getEvents(matchId, 0, seq),
    Effect.flatMap((events) => {
      const snapshot: MatchSnapshot = {
        id: uuidv4() as SnapshotId,
        matchId,
        seq,
        ts: Date.now(),
        state,
        eventCount: events.length,
      }

      return Effect.tryPromise({
        try: () => db.snapshots.add(snapshot),
        catch: (error) =>
          new DatabaseError({
            operation: 'createSnapshot',
            reason: String(error),
          }),
      })
    }),
    Effect.flatMap(() => pruneOldSnapshots(matchId, 5)),
    Effect.asVoid,
  )

// Export all operations as a service
export const EventStore = {
  appendEvent,
  getEvents,
  getLatestSnapshot,
  createSnapshot,
  getOrCreateDeviceId,
} as const
