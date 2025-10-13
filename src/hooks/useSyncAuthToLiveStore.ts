import { SessionIdSymbol } from '@livestore/livestore'
import { useClientDocument, useQuery, useStore } from '@livestore/react'
import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { userById$, userCount$ } from '../livestore/auth-queries'
import { events, tables } from '../livestore/schema'

export const useSyncAuthToLiveStore = () => {
  const { user } = useAuth()
  const { store } = useStore()
  const [currentUser, updateCurrentUser] = useClientDocument(
    tables.currentUser,
    SessionIdSymbol,
  )

  // Track if we've already registered/logged in this session
  const hasRegistered = useRef(false)

  // Query user from database
  const dbUser = useQuery(userById$(currentUser.userId))
  const totalUsers = useQuery(userCount$)

  useEffect(() => {
    if (!user) {
      // User logged out
      updateCurrentUser({
        userId: null,
        githubUsername: null,
        email: null,
        avatarUrl: null,
        displayName: null,
        role: 'anonymous',
        accessToken: null,
      })
      hasRegistered.current = false
      return
    }

    const userId = user.id
    const githubUsername =
      user.user_metadata.full_name ?? user.email?.split('@')[0] ?? 'Unknown'
    const email = user.email ?? null
    const avatarUrl = user.user_metadata.avatar_url ?? null
    const accessToken = user.token?.access_token ?? null

    // Check if user exists in database
    const userExists = dbUser !== undefined

    if (!userExists && !hasRegistered.current) {
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

      hasRegistered.current = true
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
      role: dbUser ? (dbUser.role as 'admin' | 'staff' | 'member') : 'member',
      accessToken,
    })
  }, [user, dbUser, totalUsers, store, updateCurrentUser])
}
