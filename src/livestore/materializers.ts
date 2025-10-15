import { State, defineMaterializer } from '@livestore/livestore'
import { authEvents, playerEvents, squashEvents, todoEvents } from './events'
import {
  authTables,
  playerTables,
  squashTables,
  todoTables,
  uiTables,
} from './tables'

// ============================================================================
// TODO MATERIALIZERS (Canary - will be removed after migration)
// ============================================================================

const todoMaterializers = {
  'v1.TodoCreated': ({ id, text }: { id: string; text: string }) =>
    todoTables.todos.insert({ id, text, completed: false }),
  'v1.TodoCompleted': ({ id }: { id: string }) =>
    todoTables.todos.update({ completed: true }).where({ id }),
  'v1.TodoUncompleted': ({ id }: { id: string }) =>
    todoTables.todos.update({ completed: false }).where({ id }),
  'v1.TodoDeleted': ({ id, deletedAt }: { id: string; deletedAt: Date }) =>
    todoTables.todos.update({ deletedAt }).where({ id }),
  'v1.TodoClearedCompleted': ({ deletedAt }: { deletedAt: Date }) =>
    todoTables.todos.update({ deletedAt }).where({ completed: true }),
}

// ============================================================================
// SQUASH MATERIALIZERS
// ============================================================================

// Helper to compute next server state after a rally
type ServerState = {
  team: 'A' | 'B'
  player: 1 | 2
  side: 'R' | 'L'
  handIndex: 0 | 1
  firstHandUsed: boolean
}

const computeNextServerState = (params: {
  currentServer: {
    team: 'A' | 'B'
    player: 1 | 2
    side: 'R' | 'L'
    handIndex: 0 | 1
  }
  firstHandUsed: boolean
  scoreBefore: { A: number; B: number }
  winner: 'A' | 'B'
}): ServerState => {
  const { currentServer, firstHandUsed, scoreBefore, winner } = params

  const flip = (side: 'R' | 'L'): 'R' | 'L' => (side === 'R' ? 'L' : 'R')
  const otherTeam = (team: 'A' | 'B'): 'A' | 'B' => (team === 'A' ? 'B' : 'A')

  // Server won the rally
  if (winner === currentServer.team) {
    return {
      team: currentServer.team,
      player: currentServer.player,
      side: flip(currentServer.side),
      handIndex: currentServer.handIndex,
      firstHandUsed,
    }
  }

  // Receiving team won
  const isStartOfGame = scoreBefore.A === 0 && scoreBefore.B === 0

  // First-hand exception at 0-0
  if (isStartOfGame && !firstHandUsed) {
    const t = otherTeam(currentServer.team)
    return {
      team: t,
      player: 1,
      side: 'R',
      handIndex: 0,
      firstHandUsed: true,
    }
  }

  // First hand lost (not start of game)
  if (currentServer.handIndex === 0 && !firstHandUsed) {
    const t = otherTeam(currentServer.team)
    return {
      team: t,
      player: 1,
      side: 'R',
      handIndex: 0,
      firstHandUsed: true,
    }
  }

  // First hand lost, partner serves (second hand)
  if (currentServer.handIndex === 0) {
    return {
      team: currentServer.team,
      player: currentServer.player === 1 ? 2 : 1,
      side: flip(currentServer.side),
      handIndex: 1,
      firstHandUsed: true,
    }
  }

  // Second hand lost - hand-out to other team
  const t = otherTeam(currentServer.team)
  return {
    team: t,
    player: 1,
    side: 'R',
    handIndex: 0,
    firstHandUsed: true,
  }
}

const squashMaterializers = {
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

  'v1.GameStarted': defineMaterializer(
    squashEvents.gameStarted,
    (
      {
        gameId,
        matchId,
        gameNumber,
        firstServingTeam,
        firstServingPlayer,
        firstServingSide,
        maxPoints,
        winBy,
        timestamp,
      },
      ctx,
    ) => {
      // Check if game already exists (gameId is globally unique)
      const existingGames = ctx.query(squashTables.games.where({ id: gameId }))

      // If game already exists and is completed, don't reset it (idempotent)
      if (existingGames.length > 0 && existingGames[0].status === 'completed') {
        return []
      }

      // If game exists but is in_progress, reset it to fresh state (handle replays/resets)
      if (existingGames.length > 0) {
        return squashTables.games
          .update({
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
            // Initialize current server state
            currentServerTeam: firstServingTeam,
            currentServerPlayer: firstServingPlayer,
            currentServerSide: firstServingSide,
            currentServerHandIndex: 0,
            firstHandUsed: false,
          })
          .where({ id: gameId })
      }

      return squashTables.games.insert({
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
        // Initialize current server state
        currentServerTeam: firstServingTeam,
        currentServerPlayer: firstServingPlayer,
        currentServerSide: firstServingSide,
        currentServerHandIndex: 0,
        firstHandUsed: false,
      })
    },
  ),

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

  'v1.RallyWon': defineMaterializer(
    squashEvents.rallyWon,
    (
      {
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
      },
      ctx,
    ) => {
      // Query current game state to get firstHandUsed
      const games = ctx.query(squashTables.games.where({ id: gameId }))
      const currentFirstHandUsed = games[0]?.firstHandUsed ?? false

      // Compute next server state
      const nextServerState = computeNextServerState({
        currentServer: {
          team: serverTeam,
          player: serverPlayer,
          side: serverSide,
          handIndex: serverHandIndex,
        },
        firstHandUsed: currentFirstHandUsed,
        scoreBefore: { A: scoreABefore, B: scoreBBefore },
        winner,
      })

      return [
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
        // Update game score and current server state
        squashTables.games
          .update({
            scoreA: scoreAAfter,
            scoreB: scoreBAfter,
            currentServerTeam: nextServerState.team,
            currentServerPlayer: nextServerState.player,
            currentServerSide: nextServerState.side,
            currentServerHandIndex: nextServerState.handIndex,
            firstHandUsed: nextServerState.firstHandUsed,
          })
          .where({ id: gameId }),
      ]
    },
  ),

  'v1.RallyUndone': defineMaterializer(
    squashEvents.rallyUndone,
    ({ gameId, rallyId, timestamp }, ctx) => {
      // Query the last rally for this game (if rallyId is empty, find the most recent)
      const rallies = rallyId
        ? ctx.query(
            squashTables.rallies.where({ id: rallyId, deletedAt: null }),
          )
        : ctx.query(
            squashTables.rallies
              .where({ gameId, deletedAt: null })
              .orderBy('rallyNumber', 'desc'),
          )

      const rally = rallies[0]

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!rally) return []

      // Query previous rally to determine what firstHandUsed should be
      const previousRallies = ctx.query(
        squashTables.rallies
          .where({ gameId, deletedAt: null })
          .orderBy('rallyNumber', 'desc'),
      )

      // Filter out the rally we're about to delete
      const remainingRallies = previousRallies.filter(
        (r) => r.rallyNumber < rally.rallyNumber,
      )
      const firstHandUsed = remainingRallies.length > 0

      return [
        // Soft delete the rally
        squashTables.rallies
          .update({ deletedAt: timestamp })
          .where({ id: rally.id }),
        // Restore previous score and server state
        squashTables.games
          .update({
            scoreA: rally.scoreABefore,
            scoreB: rally.scoreBBefore,
            currentServerTeam: rally.serverTeam,
            currentServerPlayer: rally.serverPlayer,
            currentServerSide: rally.serverSide,
            currentServerHandIndex: rally.serverHandIndex,
            firstHandUsed,
          })
          .where({ id: gameId }),
      ]
    },
  ),

  'v1.ServerSideToggled': ({
    gameId,
    newSide,
  }: {
    gameId: string
    newSide: 'R' | 'L'
  }) =>
    squashTables.games
      .update({
        currentServerSide: newSide,
      })
      .where({ id: gameId }),
}

// ============================================================================
// AUTH MATERIALIZERS
// ============================================================================

const authMaterializers = {
  'v1.UserRegistered': defineMaterializer(
    authEvents.userRegistered,
    (
      {
        userId,
        githubUsername,
        githubEmail,
        githubAvatarUrl,
        displayName,
        role,
        timestamp,
      },
      ctx,
    ) => {
      // Check if user already exists
      const existingUsers = ctx.query(authTables.users.where({ id: userId }))

      // If user exists, update their info and lastLoginAt (idempotent)
      if (existingUsers.length > 0) {
        return authTables.users
          .update({
            githubUsername,
            githubEmail,
            githubAvatarUrl,
            displayName,
            role,
            updatedAt: timestamp,
            lastLoginAt: timestamp,
          })
          .where({ id: userId })
      }

      // User doesn't exist, insert new record
      return authTables.users.insert({
        id: userId,
        githubUsername,
        githubEmail,
        githubAvatarUrl,
        displayName,
        role,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLoginAt: timestamp,
      })
    },
  ),

  'v1.UserLoggedIn': ({
    userId,
    timestamp,
  }: {
    userId: string
    timestamp: Date
  }) =>
    authTables.users
      .update({ lastLoginAt: timestamp, updatedAt: timestamp })
      .where({ id: userId }),

  'v1.RoleAssigned': ({
    userId,
    newRole,
    timestamp,
  }: {
    userId: string
    assignedBy: string
    newRole: 'admin' | 'staff' | 'member'
    previousRole: 'admin' | 'staff' | 'member'
    timestamp: Date
  }) =>
    authTables.users
      .update({
        role: newRole,
        updatedAt: timestamp,
      })
      .where({ id: userId }),

  'v1.UserUpdated': ({
    userId,
    githubUsername,
    githubEmail,
    displayName,
    role,
    timestamp,
  }: {
    userId: string
    githubUsername: string
    githubEmail: string | null
    displayName: string | null
    role: 'admin' | 'staff' | 'member'
    timestamp: Date
  }) =>
    authTables.users
      .update({
        githubUsername,
        githubEmail,
        displayName,
        role,
        updatedAt: timestamp,
      })
      .where({ id: userId }),

  'v1.UserDeleted': ({
    userId,
    timestamp,
  }: {
    userId: string
    timestamp: Date
  }) =>
    authTables.users
      .update({
        deletedAt: timestamp,
      })
      .where({ id: userId }),
}

// ============================================================================
// PLAYER MATERIALIZERS
// ============================================================================

const playerMaterializers = {
  'v1.PlayerCreated': ({
    playerId,
    firstName,
    lastName,
    email,
    phone,
    timestamp,
  }: {
    playerId: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    timestamp: Date
  }) =>
    playerTables.players.insert({
      id: playerId,
      firstName,
      lastName,
      email,
      phone,
      linkedUserId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }),

  'v1.PlayerUpdated': ({
    playerId,
    firstName,
    lastName,
    email,
    phone,
    timestamp,
  }: {
    playerId: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    timestamp: Date
  }) =>
    playerTables.players
      .update({
        firstName,
        lastName,
        email,
        phone,
        updatedAt: timestamp,
      })
      .where({ id: playerId }),

  'v1.PlayerDeleted': ({
    playerId,
    timestamp,
  }: {
    playerId: string
    timestamp: Date
  }) =>
    playerTables.players
      .update({
        deletedAt: timestamp,
      })
      .where({ id: playerId }),

  'v1.PlayerLinkedToUser': ({
    playerId,
    userId,
    timestamp,
  }: {
    playerId: string
    userId: string
    timestamp: Date
  }) =>
    playerTables.players
      .update({
        linkedUserId: userId,
        updatedAt: timestamp,
      })
      .where({ id: playerId }),

  'v1.PlayerUnlinkedFromUser': ({
    playerId,
    timestamp,
  }: {
    playerId: string
    timestamp: Date
  }) =>
    playerTables.players
      .update({
        linkedUserId: null,
        updatedAt: timestamp,
      })
      .where({ id: playerId }),
}

// ============================================================================
// COMBINED MATERIALIZERS
// ============================================================================

/**
 * Creates all materializers for the application.
 * Combines todo and squash materializers into a single object.
 */
export const createMaterializers = () => {
  // Combine all events (needed for typed materializers)
  const allEvents = {
    ...todoEvents,
    uiStateSet: todoTables.uiState.set,
    ...squashEvents,
    gameUiStateSet: squashTables.gameUiState.set,
    ...authEvents,
    currentUserSet: authTables.currentUser.set,
    ...playerEvents,
    modalStateSet: uiTables.modalState.set,
    nextGameSetupStateSet: uiTables.nextGameSetupState.set,
    themePreferenceSet: uiTables.themePreference.set,
  }

  return State.SQLite.materializers(allEvents, {
    ...todoMaterializers,
    ...squashMaterializers,
    ...authMaterializers,
    ...playerMaterializers,
  })
}
