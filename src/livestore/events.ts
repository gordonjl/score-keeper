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

  // v1 kept for backward compatibility with existing events
  matchSetupV1: Events.synced({
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

  // v2 is the current version (no teamAFirstServer/teamBFirstServer)
  matchSetup: Events.synced({
    name: 'v2.MatchSetup',
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
  // v1 kept for backward compatibility with existing events
  gameStartedV1: Events.synced({
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

  // v2 is the current version (adds teamAFirstServer/teamBFirstServer)
  gameStarted: Events.synced({
    name: 'v2.GameStarted',
    schema: Schema.Struct({
      gameId: Schema.String,
      matchId: Schema.String,
      gameNumber: Schema.Number,
      firstServingTeam: Schema.Literal('A', 'B'),
      firstServingPlayer: Schema.Literal(1, 2),
      firstServingSide: Schema.Literal('R', 'L'),
      teamAFirstServer: Schema.Literal(1, 2),
      teamBFirstServer: Schema.Literal(1, 2),
      maxPoints: Schema.Number,
      winBy: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  // v3 only requires first serving team's first server (other team is null)
  gameStartedV3: Events.synced({
    name: 'v3.GameStarted',
    schema: Schema.Struct({
      gameId: Schema.String,
      matchId: Schema.String,
      gameNumber: Schema.Number,
      firstServingTeam: Schema.Literal('A', 'B'),
      firstServingPlayer: Schema.Literal(1, 2),
      firstServingSide: Schema.Literal('R', 'L'),
      teamAFirstServer: Schema.NullOr(Schema.Literal(1, 2)),
      teamBFirstServer: Schema.NullOr(Schema.Literal(1, 2)),
      maxPoints: Schema.Number,
      winBy: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  secondTeamFirstServerSet: Events.synced({
    name: 'v1.SecondTeamFirstServerSet',
    schema: Schema.Struct({
      gameId: Schema.String,
      team: Schema.Literal('A', 'B'),
      firstServer: Schema.Literal(1, 2),
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

// ============================================================================
// AUTH EVENTS
// ============================================================================

export const authEvents = {
  userRegistered: Events.synced({
    name: 'v1.UserRegistered',
    schema: Schema.Struct({
      userId: Schema.String,
      githubUsername: Schema.String,
      githubEmail: Schema.NullOr(Schema.String),
      githubAvatarUrl: Schema.NullOr(Schema.String),
      displayName: Schema.NullOr(Schema.String),
      role: Schema.Literal('admin', 'staff', 'member'),
      timestamp: Schema.Date,
    }),
  }),

  userLoggedIn: Events.synced({
    name: 'v1.UserLoggedIn',
    schema: Schema.Struct({
      userId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),

  roleAssigned: Events.synced({
    name: 'v1.RoleAssigned',
    schema: Schema.Struct({
      userId: Schema.String,
      assignedBy: Schema.String,
      newRole: Schema.Literal('admin', 'staff', 'member'),
      previousRole: Schema.Literal('admin', 'staff', 'member'),
      timestamp: Schema.Date,
    }),
  }),

  userUpdated: Events.synced({
    name: 'v1.UserUpdated',
    schema: Schema.Struct({
      userId: Schema.String,
      githubUsername: Schema.String,
      githubEmail: Schema.NullOr(Schema.String),
      displayName: Schema.NullOr(Schema.String),
      role: Schema.Literal('admin', 'staff', 'member'),
      timestamp: Schema.Date,
    }),
  }),

  userDeleted: Events.synced({
    name: 'v1.UserDeleted',
    schema: Schema.Struct({
      userId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),
}

// ============================================================================
// PLAYER EVENTS
// ============================================================================

export const playerEvents = {
  playerCreated: Events.synced({
    name: 'v1.PlayerCreated',
    schema: Schema.Struct({
      playerId: Schema.String,
      firstName: Schema.String,
      lastName: Schema.String,
      email: Schema.NullOr(Schema.String),
      phone: Schema.NullOr(Schema.String),
      timestamp: Schema.Date,
    }),
  }),

  playerUpdated: Events.synced({
    name: 'v1.PlayerUpdated',
    schema: Schema.Struct({
      playerId: Schema.String,
      firstName: Schema.String,
      lastName: Schema.String,
      email: Schema.NullOr(Schema.String),
      phone: Schema.NullOr(Schema.String),
      timestamp: Schema.Date,
    }),
  }),

  playerDeleted: Events.synced({
    name: 'v1.PlayerDeleted',
    schema: Schema.Struct({
      playerId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),

  playerLinkedToUser: Events.synced({
    name: 'v1.PlayerLinkedToUser',
    schema: Schema.Struct({
      playerId: Schema.String,
      userId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),

  playerUnlinkedFromUser: Events.synced({
    name: 'v1.PlayerUnlinkedFromUser',
    schema: Schema.Struct({
      playerId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),
}
