import { Effect, Array as EffectArray, pipe } from 'effect'
import { v4 as uuidv4 } from 'uuid'
import { db } from './schema'
import { EventStore } from './eventStore'
import { DatabaseError } from './types'
import type {
  Match,
  MatchEvent,
  MatchId,
  MatchSnapshot,
  MatchStatus,
} from './types'

// Match filter options
type MatchFilter = {
  readonly status?: MatchStatus
  readonly playerName?: string
  readonly fromDate?: number
  readonly toDate?: number
}

// Export data structure
type MatchExport = {
  readonly match: Match
  readonly events: ReadonlyArray<unknown>
  readonly snapshots: ReadonlyArray<unknown>
  readonly exportedAt: number
  readonly version: number
}

// Create new match
export const createMatch = (
  playerNames: ReadonlyArray<string>,
): Effect.Effect<MatchId, DatabaseError> => {
  const matchId = uuidv4() as MatchId
  const now = Date.now()

  const match: Match = {
    id: matchId,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    playerNames: [...playerNames],
    currentSeq: 0,
  }

  return pipe(
    Effect.tryPromise({
      try: () => db.matches.add(match),
      catch: (error) =>
        new DatabaseError({
          operation: 'createMatch',
          reason: String(error),
        }),
    }),
    Effect.map(() => matchId),
  )
}

// Apply filters to matches
const applyFilters = (
  matches: ReadonlyArray<Match>,
  filter?: MatchFilter,
): ReadonlyArray<Match> =>
  pipe(
    matches,
    EffectArray.filter(
      (m) => !filter?.fromDate || m.createdAt >= filter.fromDate,
    ),
    EffectArray.filter((m) => !filter?.toDate || m.createdAt <= filter.toDate),
    EffectArray.sort((a: Match, b: Match) =>
      a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
    ),
  )

// List matches with filters
export const listMatches = (
  filter?: MatchFilter,
): Effect.Effect<ReadonlyArray<Match>, DatabaseError> =>
  Effect.tryPromise({
    try: async () => {
      if (filter?.status) {
        return db.matches.where('status').equals(filter.status).toArray()
      }
      if (filter?.playerName) {
        return db.matches
          .where('playerNames')
          .equals(filter.playerName)
          .toArray()
      }
      return db.matches.toArray()
    },
    catch: (error) =>
      new DatabaseError({
        operation: 'listMatches',
        reason: String(error),
      }),
  }).pipe(Effect.map((matches) => applyFilters(matches, filter)))

// Archive match
export const archiveMatch = (
  matchId: MatchId,
): Effect.Effect<void, DatabaseError> =>
  Effect.tryPromise({
    try: () =>
      db.matches.update(matchId, {
        status: 'archived' as MatchStatus,
        updatedAt: Date.now(),
      }),
    catch: (error) =>
      new DatabaseError({
        operation: 'archiveMatch',
        reason: String(error),
      }),
  }).pipe(Effect.asVoid)

// Delete match and all associated data
export const deleteMatch = (
  matchId: MatchId,
): Effect.Effect<void, DatabaseError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction('rw', [db.matches, db.events, db.snapshots], async () => {
        await db.matches.delete(matchId)
        await db.events.where('matchId').equals(matchId).delete()
        await db.snapshots.where('matchId').equals(matchId).delete()
      }),
    catch: (error) =>
      new DatabaseError({
        operation: 'deleteMatch',
        reason: String(error),
      }),
  })

// Export match data (for backup/sharing)
export const exportMatch = (
  matchId: MatchId,
): Effect.Effect<MatchExport, DatabaseError> =>
  pipe(
    Effect.all([
      Effect.tryPromise({
        try: () => db.matches.get(matchId),
        catch: (error) =>
          new DatabaseError({
            operation: 'exportMatch:getMatch',
            reason: String(error),
          }),
      }),
      EventStore.getEvents(matchId),
      Effect.tryPromise({
        try: () => db.snapshots.where('matchId').equals(matchId).toArray(),
        catch: (error) =>
          new DatabaseError({
            operation: 'exportMatch:getSnapshots',
            reason: String(error),
          }),
      }),
    ]),
    Effect.flatMap(([match, events, snapshots]) =>
      match
        ? Effect.succeed({
            match,
            events,
            snapshots,
            exportedAt: Date.now(),
            version: 1,
          } as const)
        : Effect.fail(
            new DatabaseError({
              operation: 'exportMatch',
              reason: `Match ${matchId} not found`,
            }),
          ),
    ),
  )

// Import match data
export const importMatch = (
  data: MatchExport,
): Effect.Effect<MatchId, DatabaseError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        db.transaction(
          'rw',
          [db.matches, db.events, db.snapshots],
          async () => {
            await db.matches.add(data.match)
            await db.events.bulkAdd(data.events as Array<MatchEvent>)
            if (data.snapshots.length > 0) {
              await db.snapshots.bulkAdd(data.snapshots as Array<MatchSnapshot>)
            }
            return data.match.id
          },
        ),
      catch: (error) =>
        new DatabaseError({
          operation: 'importMatch',
          reason: String(error),
        }),
    }),
  )

// Export all operations as a service
export const MatchManager = {
  createMatch,
  listMatches,
  archiveMatch,
  deleteMatch,
  exportMatch,
  importMatch,
} as const
