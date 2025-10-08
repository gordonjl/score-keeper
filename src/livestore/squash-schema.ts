import { Events, Schema, SessionIdSymbol, State } from '@livestore/livestore'

// ============================================================================
// TABLES
// ============================================================================

export const squashTables = {
  // Match metadata
  matches: State.SQLite.table({
    name: 'matches',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      status: State.SQLite.text({ default: 'active' }), // 'active' | 'completed' | 'archived'
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      // Players
      playerA1FirstName: State.SQLite.text({ default: '' }),
      playerA1LastName: State.SQLite.text({ default: '' }),
      playerA2FirstName: State.SQLite.text({ default: '' }),
      playerA2LastName: State.SQLite.text({ default: '' }),
      playerB1FirstName: State.SQLite.text({ default: '' }),
      playerB1LastName: State.SQLite.text({ default: '' }),
      playerB2FirstName: State.SQLite.text({ default: '' }),
      playerB2LastName: State.SQLite.text({ default: '' }),
      // First servers (1 or 2)
      teamAFirstServer: State.SQLite.integer({ default: 1 }),
      teamBFirstServer: State.SQLite.integer({ default: 1 }),
    },
  }),

  // Individual games within matches
  games: State.SQLite.table({
    name: 'games',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      matchId: State.SQLite.text(),
      gameNumber: State.SQLite.integer(),
      status: State.SQLite.text({ default: 'in_progress' }), // 'in_progress' | 'completed'
      scoreA: State.SQLite.integer({ default: 0 }),
      scoreB: State.SQLite.integer({ default: 0 }),
      winner: State.SQLite.text({ nullable: true }), // 'A' | 'B' | null
      maxPoints: State.SQLite.integer({ default: 15 }),
      winBy: State.SQLite.integer({ default: 1 }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      completedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
      // First server info
      firstServingTeam: State.SQLite.text({ default: 'A' }),
      firstServingPlayer: State.SQLite.integer({ default: 1 }),
      firstServingSide: State.SQLite.text({ default: 'R' }),
    },
  }),

  // Rally history for statistics and replay
  rallies: State.SQLite.table({
    name: 'rallies',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      gameId: State.SQLite.text(),
      rallyNumber: State.SQLite.integer(),
      winner: State.SQLite.text(), // 'A' | 'B'
      serverTeam: State.SQLite.text(),
      serverPlayer: State.SQLite.integer(), // 1 or 2
      serverSide: State.SQLite.text(), // 'R' | 'L'
      serverHandIndex: State.SQLite.integer(), // 0 or 1
      scoreABefore: State.SQLite.integer(),
      scoreBBefore: State.SQLite.integer(),
      scoreAAfter: State.SQLite.integer(),
      scoreBAfter: State.SQLite.integer(),
      timestamp: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      // Soft delete for undo
      deletedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
    },
  }),

  // Current game UI state (client-only, not synced)
  gameUiState: State.SQLite.clientDocument({
    name: 'gameUiState',
    schema: Schema.Struct({
      matchId: Schema.String,
      currentGameId: Schema.NullOr(Schema.String),
      // Activity grid stored as JSON for now (can normalize later)
      activityGrid: Schema.optional(Schema.Unknown),
      // Current server state
      currentServer: Schema.optional(
        Schema.Struct({
          team: Schema.Literal('A', 'B'),
          player: Schema.Literal(1, 2),
          side: Schema.Literal('R', 'L'),
          handIndex: Schema.Literal(0, 1),
        }),
      ),
      firstHandUsed: Schema.Boolean,
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        matchId: '',
        currentGameId: null,
        firstHandUsed: false,
      },
    },
  }),
}

// ============================================================================
// EVENTS
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

  // ===== UI state events (client-only) =====
  gameUiStateSet: squashTables.gameUiState.set,
}

// ============================================================================
// MATERIALIZERS
// ============================================================================

// Note: Materializers are created inline in the consuming schema file
// to enable proper type inference from State.SQLite.materializers()
export const createSquashMaterializers = () => ({
  'v1.MatchCreated': ({
    matchId,
    timestamp,
  }: {
    matchId: string
    timestamp: Date
  }) =>
    squashTables.matches.insert({
      id: matchId,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    }),

  'v1.MatchSetup': ({
    matchId,
    playerA1,
    playerA2,
    playerB1,
    playerB2,
    teamAFirstServer,
    teamBFirstServer,
    timestamp,
  }: {
    matchId: string
    playerA1: { firstName: string; lastName: string }
    playerA2: { firstName: string; lastName: string }
    playerB1: { firstName: string; lastName: string }
    playerB2: { firstName: string; lastName: string }
    teamAFirstServer: 1 | 2
    teamBFirstServer: 1 | 2
    timestamp: Date
  }) =>
    squashTables.matches
      .update({
        playerA1FirstName: playerA1.firstName,
        playerA1LastName: playerA1.lastName,
        playerA2FirstName: playerA2.firstName,
        playerA2LastName: playerA2.lastName,
        playerB1FirstName: playerB1.firstName,
        playerB1LastName: playerB1.lastName,
        playerB2FirstName: playerB2.firstName,
        playerB2LastName: playerB2.lastName,
        teamAFirstServer,
        teamBFirstServer,
        updatedAt: timestamp,
      })
      .where({ id: matchId }),

  'v1.MatchCompleted': ({
    matchId,
    timestamp,
  }: {
    matchId: string
    timestamp: Date
  }) =>
    squashTables.matches
      .update({
        status: 'completed',
        updatedAt: timestamp,
      })
      .where({ id: matchId }),

  'v1.MatchArchived': ({
    matchId,
    timestamp,
  }: {
    matchId: string
    timestamp: Date
  }) =>
    squashTables.matches
      .update({
        status: 'archived',
        updatedAt: timestamp,
      })
      .where({ id: matchId }),

  'v1.GameStarted': ({
    gameId,
    matchId,
    gameNumber,
    firstServingTeam,
    firstServingPlayer,
    firstServingSide,
    maxPoints,
    winBy,
    timestamp,
  }: {
    gameId: string
    matchId: string
    gameNumber: number
    firstServingTeam: 'A' | 'B'
    firstServingPlayer: 1 | 2
    firstServingSide: 'R' | 'L'
    maxPoints: number
    winBy: number
    timestamp: Date
  }) =>
    squashTables.games.insert({
      id: gameId,
      matchId,
      gameNumber,
      status: 'in_progress',
      scoreA: 0,
      scoreB: 0,
      winner: null,
      maxPoints,
      winBy,
      createdAt: timestamp,
      completedAt: null,
      firstServingTeam,
      firstServingPlayer,
      firstServingSide,
    }),

  'v1.GameCompleted': ({
    gameId,
    winner,
    finalScoreA,
    finalScoreB,
    timestamp,
  }: {
    gameId: string
    winner: 'A' | 'B'
    finalScoreA: number
    finalScoreB: number
    timestamp: Date
  }) =>
    squashTables.games
      .update({
        status: 'completed',
        winner,
        scoreA: finalScoreA,
        scoreB: finalScoreB,
        completedAt: timestamp,
      })
      .where({ id: gameId }),

  'v1.RallyWon': ({
    rallyId,
    gameId,
    rallyNumber,
    winner,
    serverTeam,
    serverPlayer,
    serverSide,
    serverHandIndex,
    scoreABefore,
    scoreBBefore,
    scoreAAfter,
    scoreBAfter,
    timestamp,
  }: {
    rallyId: string
    gameId: string
    rallyNumber: number
    winner: 'A' | 'B'
    serverTeam: 'A' | 'B'
    serverPlayer: 1 | 2
    serverSide: 'R' | 'L'
    serverHandIndex: 0 | 1
    scoreABefore: number
    scoreBBefore: number
    scoreAAfter: number
    scoreBAfter: number
    timestamp: Date
  }) => [
    // Insert rally record
    squashTables.rallies.insert({
      id: rallyId,
      gameId,
      rallyNumber,
      winner,
      serverTeam,
      serverPlayer,
      serverSide,
      serverHandIndex,
      scoreABefore,
      scoreBBefore,
      scoreAAfter,
      scoreBAfter,
      timestamp,
      deletedAt: null,
    }),
    // Update game score
    squashTables.games
      .update({
        scoreA: scoreAAfter,
        scoreB: scoreBAfter,
      })
      .where({ id: gameId }),
  ],

  'v1.RallyUndone': (
    { gameId, rallyId, timestamp }: { gameId: string; rallyId: string; timestamp: Date },
    // @ts-expect-error - LiveStore will provide proper typing when passed to State.SQLite.materializers()
    ctx,
  ) => {
    // Query the rally to undo - ctx.query accepts QueryBuilder directly
    const rally = ctx.query(
      squashTables.rallies.where({ id: rallyId, deletedAt: null }).first(),
    ) as
      | {
          scoreABefore: number
          scoreBBefore: number
        }
      | undefined

    if (!rally) return []

    return [
      // Soft delete the rally
      squashTables.rallies
        .update({ deletedAt: timestamp })
        .where({ id: rallyId }),
      // Restore previous score
      squashTables.games
        .update({
          scoreA: rally.scoreABefore,
          scoreB: rally.scoreBBefore,
        })
        .where({ id: gameId }),
    ]
  },
})
