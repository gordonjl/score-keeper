import { queryDb } from '@livestore/livestore'
import { authTables } from './tables'

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Get all active (non-deleted) users
 */
export const activeUsers$ = queryDb(
  () => authTables.users.orderBy('createdAt', 'desc'),
  {
    label: 'active-users',
    map: (users) => users.filter((user) => !user.deletedAt),
  },
)

/**
 * Get user by ID
 */
export const userById$ = (userId: string) =>
  queryDb(() => authTables.users.where({ id: userId }).first(), {
    label: `user-${userId}`,
    deps: [userId],
  })

/**
 * Get users by role
 */
export const usersByRole$ = (role: string) =>
  queryDb(() => authTables.users.where({ role }).orderBy('createdAt', 'desc'), {
    label: `users-role-${role}`,
    deps: [role],
    map: (users) => users.filter((user) => !user.deletedAt),
  })
