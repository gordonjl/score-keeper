import { useAuth0 } from '@auth0/auth0-react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// Normalized user type that matches our LiveStore schema
type AppUser = {
  id: string
  email?: string
  user_metadata: {
    avatar_url?: string
    full_name?: string
  }
  app_metadata: {
    provider: string
    roles?: Array<string>
  }
  token?: {
    access_token: string
    expires_at: number
    refresh_token?: string
  }
}

type AuthContextType = {
  user: AppUser | null
  login: () => void
  logout: () => void
  isLoading: boolean
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0()

  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Transform Auth0 user to our AppUser format
  useEffect(() => {
    if (auth0Loading) {
      setIsLoading(true)
      return
    }

    if (isAuthenticated && auth0User) {
      const normalizedUser: AppUser = {
        id: auth0User.sub ?? '',
        email: auth0User.email,
        user_metadata: {
          avatar_url: auth0User.picture,
          full_name: auth0User.name,
        },
        app_metadata: {
          provider: auth0User.sub?.split('|')[0] ?? 'auth0',
          roles: [],
        },
      }

      setUser(normalizedUser)
      console.log('User logged in:', normalizedUser.email)
    } else {
      setUser(null)
    }

    setIsLoading(false)
  }, [auth0User, isAuthenticated, auth0Loading])

  const login = () => {
    void loginWithRedirect({
      appState: {
        returnTo: window.location.pathname,
      },
    })
  }

  const logout = () => {
    void auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }

  const getToken = async (): Promise<string | null> => {
    try {
      const token = await getAccessTokenSilently()
      return token
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    getToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
