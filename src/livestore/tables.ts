import { Schema, SessionIdSymbol, State } from '@livestore/livestore'

// ============================================================================
// TODO TABLES (Canary - will be removed after migration)
// ============================================================================

export const todoTables = {
  todos: State.SQLite.table({
    name: 'todos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      text: State.SQLite.text({ default: '' }),
      completed: State.SQLite.boolean({ default: false }),
      deletedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
    },
  }),
  // Client documents can be used for local-only state (e.g. form inputs)
  uiState: State.SQLite.clientDocument({
    name: 'uiState',
    schema: Schema.Struct({
      newTodoText: Schema.String,
      filter: Schema.Literal('all', 'active', 'completed'),
    }),
    default: { id: SessionIdSymbol, value: { newTodoText: '', filter: 'all' } },
  }),
}

// ============================================================================
// SQUASH TABLES
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
      // First server info (immutable after game creation)
      firstServingTeam: State.SQLite.text({ default: 'A' }),
      firstServingPlayer: State.SQLite.integer({ default: 1 }),
      firstServingSide: State.SQLite.text({ default: 'R' }),
      // Current server state (updated after each rally)
      currentServerTeam: State.SQLite.text({ default: 'A' }), // 'A' | 'B'
      currentServerPlayer: State.SQLite.integer({ default: 1 }), // 1 | 2
      currentServerSide: State.SQLite.text({ default: 'R' }), // 'R' | 'L'
      currentServerHandIndex: State.SQLite.integer({ default: 0 }), // 0 | 1
      firstHandUsed: State.SQLite.boolean({ default: false }),
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
// UI STATE CLIENT DOCUMENTS
// ============================================================================

export const uiTables = {
  // Modal states - persists across page refreshes
  modalState: State.SQLite.clientDocument({
    name: 'modalState',
    schema: Schema.Struct({
      deleteModal: Schema.Struct({
        isOpen: Schema.Boolean,
        matchId: Schema.NullOr(Schema.String),
        teamAName: Schema.String,
        teamBName: Schema.String,
      }),
      letStrokeModal: Schema.Struct({
        isOpen: Schema.Boolean,
      }),
      timersModal: Schema.Struct({
        isOpen: Schema.Boolean,
      }),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        deleteModal: {
          isOpen: false,
          matchId: null,
          teamAName: '',
          teamBName: '',
        },
        letStrokeModal: { isOpen: false },
        timersModal: { isOpen: false },
      },
    },
  }),

  // Next game setup state
  nextGameSetupState: State.SQLite.clientDocument({
    name: 'nextGameSetupState',
    schema: Schema.Struct({
      isOpen: Schema.Boolean,
      matchId: Schema.String,
      gameNumber: Schema.Number,
      firstServingTeam: Schema.Literal('A', 'B'),
      teamAFirstServer: Schema.Literal(1, 2),
      teamBFirstServer: Schema.Literal(1, 2),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        isOpen: false,
        matchId: '',
        gameNumber: 1,
        firstServingTeam: 'A',
        teamAFirstServer: 1,
        teamBFirstServer: 1,
      },
    },
  }),

  // Theme preference
  themePreference: State.SQLite.clientDocument({
    name: 'themePreference',
    schema: Schema.Struct({
      theme: Schema.Literal('pcsquash', 'pcsquash-dark', 'system'),
    }),
    default: {
      id: SessionIdSymbol,
      value: { theme: 'system' },
    },
  }),
}
