import { SessionIdSymbol } from '@livestore/livestore'
import { useClientDocument, useQuery, useStore } from '@livestore/react'
import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { userById$, userCount$ } from '../livestore/auth-queries'
import { events, tables } from '../livestore/schema'

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

  // Query user from database using the Auth0 user ID (not currentUser.userId which may be null)
  const dbUser = useQuery(userById$(user?.id ?? null))
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

      // Check if user exists in database
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const userExists = dbUser != null

      if (!userExists) {
        // First time user - register them
        // Check if this is the first user in the store (should be admin)
        const role = totalUsers === 0 ? 'admin' : 'member'

        // Commit registration event
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
      } else {
        // Existing user - just log them in
        store.commit(
          events.userLoggedIn({
            userId,
            timestamp: new Date(),
          }),
        )
      }

      // Update client document
      updateCurrentUser({
        userId,
        githubUsername,
        email,
        avatarUrl,
        displayName: githubUsername,
        // dbUser can be undefined if user doesn't exist in DB yet
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        role: (dbUser?.role as 'admin' | 'staff' | 'member' | undefined) ?? 'member',
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
