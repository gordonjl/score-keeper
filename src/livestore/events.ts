import { Events, Schema } from '@livestore/livestore'

// ============================================================================
// TODO EVENTS (Canary - will be removed after migration)
// ============================================================================

export const todoEvents = {
  todoCreated: Events.synced({
    name: 'v1.TodoCreated',
    schema: Schema.Struct({ id: Schema.String, text: Schema.String }),
  }),
  todoCompleted: Events.synced({
    name: 'v1.TodoCompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoUncompleted: Events.synced({
    name: 'v1.TodoUncompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoDeleted: Events.synced({
    name: 'v1.TodoDeleted',
    schema: Schema.Struct({ id: Schema.String, deletedAt: Schema.Date }),
  }),
  todoClearedCompleted: Events.synced({
    name: 'v1.TodoClearedCompleted',
    schema: Schema.Struct({ deletedAt: Schema.Date }),
  }),
}

// ============================================================================
// SQUASH EVENTS
// ============================================================================

export const squashEvents = {
  // ===== Match lifecycle events =====
  matchCreated: Events.synced({
    name: 'v1.MatchCreated',
    schema: Schema.Struct({
      matchId: Schema.String,
      playerNames: Schema.Array(Schema.String),
      timestamp: Schema.Date,
    }),
  }),

  matchSetup: Events.synced({
    name: 'v1.MatchSetup',
    schema: Schema.Struct({
      matchId: Schema.String,
      playerA1: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      playerA2: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      playerB1: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      playerB2: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      teamAFirstServer: Schema.Literal(1, 2),
      teamBFirstServer: Schema.Literal(1, 2),
      timestamp: Schema.Date,
    }),
  }),

  matchCompleted: Events.synced({
    name: 'v1.MatchCompleted',
    schema: Schema.Struct({
      matchId: Schema.String,
      winner: Schema.Literal('A', 'B'),
      timestamp: Schema.Date,
    }),
  }),

  matchArchived: Events.synced({
    name: 'v1.MatchArchived',
    schema: Schema.Struct({
      matchId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),

  // ===== Game lifecycle events =====
  gameStarted: Events.synced({
    name: 'v1.GameStarted',
    schema: Schema.Struct({
      gameId: Schema.String,
      matchId: Schema.String,
      gameNumber: Schema.Number,
      firstServingTeam: Schema.Literal('A', 'B'),
      firstServingPlayer: Schema.Literal(1, 2),
      firstServingSide: Schema.Literal('R', 'L'),
      maxPoints: Schema.Number,
      winBy: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  gameCompleted: Events.synced({
    name: 'v1.GameCompleted',
    schema: Schema.Struct({
      gameId: Schema.String,
      matchId: Schema.String,
      winner: Schema.Literal('A', 'B'),
      finalScoreA: Schema.Number,
      finalScoreB: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  // ===== Rally events =====
  rallyWon: Events.synced({
    name: 'v1.RallyWon',
    schema: Schema.Struct({
      rallyId: Schema.String,
      gameId: Schema.String,
      rallyNumber: Schema.Number,
      winner: Schema.Literal('A', 'B'),
      serverTeam: Schema.Literal('A', 'B'),
      serverPlayer: Schema.Literal(1, 2),
      serverSide: Schema.Literal('R', 'L'),
      serverHandIndex: Schema.Literal(0, 1),
      scoreABefore: Schema.Number,
      scoreBBefore: Schema.Number,
      scoreAAfter: Schema.Number,
      scoreBAfter: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  rallyUndone: Events.synced({
    name: 'v1.RallyUndone',
    schema: Schema.Struct({
      gameId: Schema.String,
      rallyId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),

  serverSideToggled: Events.synced({
    name: 'v1.ServerSideToggled',
    schema: Schema.Struct({
      gameId: Schema.String,
      newSide: Schema.Literal('R', 'L'),
      timestamp: Schema.Date,
    }),
  }),
}
