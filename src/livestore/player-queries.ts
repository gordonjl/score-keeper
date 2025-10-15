import { queryDb } from '@livestore/livestore'
import { playerTables } from './tables'

// ============================================================================
// PLAYER QUERIES
// ============================================================================

/**
 * Get all active (non-deleted) players
 */
export const activePlayers$ = queryDb(
  () => playerTables.players.orderBy('lastName', 'asc'),
  {
    label: 'active-players',
    map: (players) => players.filter((player) => !player.deletedAt),
  },
)

/**
 * Get player by ID
 */
export const playerById$ = (playerId: string) =>
  queryDb(() => playerTables.players.where({ id: playerId }).first(), {
    label: `player-${playerId}`,
    deps: [playerId],
  })

/**
 * Get unlinked players (not linked to any user account)
 */
export const unlinkedPlayers$ = queryDb(
  () =>
    playerTables.players
      .where({ linkedUserId: null })
      .orderBy('lastName', 'asc'),
  {
    label: 'unlinked-players',
    map: (players) => players.filter((player) => !player.deletedAt),
  },
)

/**
 * Get players linked to a specific user
 */
export const playersLinkedToUser$ = (userId: string) =>
  queryDb(
    () =>
      playerTables.players
        .where({ linkedUserId: userId })
        .orderBy('lastName', 'asc'),
    {
      label: `players-linked-to-${userId}`,
      deps: [userId],
      map: (players) => players.filter((player) => !player.deletedAt),
    },
  )
