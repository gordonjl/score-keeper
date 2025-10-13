import { queryDb } from '@livestore/livestore'
import { authTables } from './tables'

/**
 * Get user by ID
 * Returns undefined if userId is null or user not found
 */
export const userById$ = (userId: string | null) => {
  if (!userId) {
    // Return a query that will always return undefined
    return queryDb(() => authTables.users.where({ id: '__NEVER_EXISTS__' }), {
      label: 'user-null',
      deps: [userId],
      map: (rows) => rows[0],
    })
  }
  return queryDb(() => authTables.users.where({ id: userId }).first(), {
    label: `user-${userId}`,
    deps: [userId],
  })
}

/**
 * Get all users (non-deleted)
 */
export const allUsers$ = queryDb(
  () => authTables.users.orderBy('createdAt', 'desc'),
  { label: 'all-users' },
)

/**
 * Count all users (for determining first admin)
 */
export const userCount$ = queryDb(() => authTables.users.count(), {
  label: 'user-count',
})
