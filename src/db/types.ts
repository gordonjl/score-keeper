import { Schema } from 'effect'

// Core event structure with Effect Schema validation
export const MatchEventSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('EventId')),
  matchId: Schema.String.pipe(Schema.brand('MatchId')),
  seq: Schema.Number.pipe(Schema.int(), Schema.positive()),
  ts: Schema.Number.pipe(Schema.int(), Schema.positive()),
  source: Schema.String.pipe(Schema.brand('DeviceId')),
  type: Schema.String,
  payload: Schema.Unknown,
  hash: Schema.optional(Schema.String),
  version: Schema.Number.pipe(Schema.int(), Schema.positive()),
})

export type MatchEvent = Schema.Schema.Type<typeof MatchEventSchema>

// Snapshot for performance (periodic compaction)
export const MatchSnapshotSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('SnapshotId')),
  matchId: Schema.String.pipe(Schema.brand('MatchId')),
  seq: Schema.Number.pipe(Schema.int(), Schema.positive()),
  ts: Schema.Number.pipe(Schema.int(), Schema.positive()),
  state: Schema.Unknown,
  eventCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
})

export type MatchSnapshot = Schema.Schema.Type<typeof MatchSnapshotSchema>

// Match metadata
export const MatchStatusSchema = Schema.Literal(
  'active',
  'completed',
  'archived',
)
export type MatchStatus = Schema.Schema.Type<typeof MatchStatusSchema>

export const MatchSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('MatchId')),
  createdAt: Schema.Number.pipe(Schema.int(), Schema.positive()),
  updatedAt: Schema.Number.pipe(Schema.int(), Schema.positive()),
  status: MatchStatusSchema,
  playerNames: Schema.Array(Schema.String),
  currentSeq: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
})

export type Match = Schema.Schema.Type<typeof MatchSchema>

// Branded types for type safety - extract from schemas
export type EventId = MatchEvent['id']
export type MatchId = Match['id']
export type SnapshotId = MatchSnapshot['id']
export type DeviceId = MatchEvent['source']

// Error types
export class MatchNotFoundError extends Schema.TaggedError<MatchNotFoundError>()(
  'MatchNotFoundError',
  {
    matchId: Schema.String,
  },
) {}

export class EventAppendError extends Schema.TaggedError<EventAppendError>()(
  'EventAppendError',
  {
    matchId: Schema.String,
    reason: Schema.String,
  },
) {}

export class StateReconstructionError extends Schema.TaggedError<StateReconstructionError>()(
  'StateReconstructionError',
  {
    matchId: Schema.String,
    reason: Schema.String,
  },
) {}

export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  'DatabaseError',
  {
    operation: Schema.String,
    reason: Schema.String,
  },
) {}
