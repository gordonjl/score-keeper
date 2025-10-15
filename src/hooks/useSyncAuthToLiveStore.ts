import { SessionIdSymbol } from '@livestore/livestore'
import { useClientDocument, useQuery, useStore } from '@livestore/react'
import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { userCount$ } from '../livestore/auth-queries'
import { events, tables } from '../livestore/schema'
import { authTables } from '../livestore/tables'

export const useSyncAuthToLiveStore = () => {
  const { user, getToken } = useAuth()
  const { store } = useStore()
  const [, updateCurrentUser] = useClientDocument(
    tables.currentUser,
    SessionIdSymbol,
  )

  // Track if we've already synced this user session
  const hasSynced = useRef(false)
  const lastUserId = useRef<string | null>(null)

  // Query total user count to determine if this is the first user (admin)
  const totalUsers = useQuery(userCount$)

  // Effect to handle logout
  useEffect(() => {
    if (!user) {
      updateCurrentUser({
        userId: null,
        githubUsername: null,
        email: null,
        avatarUrl: null,
        displayName: null,
        role: 'anonymous',
        accessToken: null,
      })
      hasSynced.current = false
      lastUserId.current = null
    }
  }, [user, updateCurrentUser])

  // Effect to handle login/registration - only runs when user ID changes
  useEffect(() => {
    if (!user) return

    // Skip if we've already synced this exact user
    if (hasSynced.current && lastUserId.current === user.id) {
      return
    }

    const syncUser = async () => {
      const userId = user.id
      const githubUsername =
        user.user_metadata.full_name ?? user.email?.split('@')[0] ?? 'Unknown'
      const email = user.email ?? null
      const avatarUrl = user.user_metadata.avatar_url ?? null
      const accessToken = await getToken()

      // Determine role: first user in the store becomes admin
      const role = totalUsers === 0 ? 'admin' : 'member'

      // Always commit userRegistered event - the idempotent materializer
      // will handle whether to insert (new user) or update (existing user)
      // This prevents race conditions when multiple browsers log in simultaneously
      store.commit(
        events.userRegistered({
          userId,
          githubUsername,
          githubEmail: email,
          githubAvatarUrl: avatarUrl,
          displayName: githubUsername,
          role,
          timestamp: new Date(),
        }),
      )

      // Query the fresh user data from database after materializer has run
      // Use the table query directly to get the updated user
      const freshUserRows = store.query(
        authTables.users.where({ id: userId }).limit(1),
      )
      const freshUser = freshUserRows.length > 0 ? freshUserRows[0] : undefined

      // Update client document with fresh data from database
      updateCurrentUser({
        userId,
        githubUsername: freshUser?.githubUsername ?? githubUsername,
        email: freshUser?.githubEmail ?? email,
        avatarUrl: freshUser?.githubAvatarUrl ?? avatarUrl,
        displayName: freshUser?.displayName ?? githubUsername,
        role:
          (freshUser?.role as 'admin' | 'staff' | 'member' | undefined) ??
          'member',
        accessToken,
      })

      // Mark as synced
      hasSynced.current = true
      lastUserId.current = userId
    }

    void syncUser()
    // Only run when user.id changes - ignore other reactive values to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
}
