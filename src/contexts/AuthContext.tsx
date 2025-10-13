import netlifyIdentity from 'netlify-identity-widget'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type NetlifyUser = {
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
  user: NetlifyUser | null
  login: () => void
  logout: () => void
  isLoading: boolean
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<NetlifyUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    // Wait for DOM to be ready before initializing
    const initializeAuth = () => {
      // Initialize Netlify Identity
      netlifyIdentity.init()

      // Get current user on mount
      const currentUser = netlifyIdentity.currentUser() as NetlifyUser | null
      setUser(currentUser)
      setIsLoading(false)
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeAuth, 0)
    
    if (document.readyState === 'complete') {
      clearTimeout(timer)
      initializeAuth()
    }

    // Listen for login event
    const handleLogin = (loggedInUser: NetlifyUser) => {
      console.log('User logged in:', loggedInUser.email)
      setUser(loggedInUser)
      netlifyIdentity.close()
    }

    // Listen for logout event
    const handleLogout = () => {
      console.log('User logged out')
      setUser(null)
    }

    // Listen for error event
    const handleError = (error: Error) => {
      console.error('Netlify Identity error:', error)
    }

    // @ts-expect-error - netlify-identity-widget types are incomplete
    netlifyIdentity.on('login', handleLogin)
    netlifyIdentity.on('logout', handleLogout)
    netlifyIdentity.on('error', handleError)

    return () => {
      clearTimeout(timer)
      // @ts-expect-error - netlify-identity-widget types are incomplete
      netlifyIdentity.off('login', handleLogin)
      netlifyIdentity.off('logout', handleLogout)
      netlifyIdentity.off('error', handleError)
    }
  }, [])

  const login = () => {
    netlifyIdentity.open('login')
  }

  const logout = () => {
    void netlifyIdentity.logout()
  }

  const getToken = (): string | null => {
    return user?.token?.access_token ?? null
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
