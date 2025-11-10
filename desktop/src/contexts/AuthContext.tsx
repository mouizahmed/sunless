import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react'
import {
  auth,
  onAuthStateChanged,
  signInWithCustomToken,
} from '@/config/firebase'

interface User {
  id: string
  email: string
  name: string
  picture?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  loginLoading: boolean
  loginProvider: 'google' | null
  setUser: (user: User | null) => void
  logout: () => void
  logoutEverywhere: () => void
  loginWithGoogle: () => Promise<void>
  cancelAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginProvider, setLoginProvider] = useState<'google' | null>(null)

  // Store auth timeout ID
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auth session listener
  useEffect(() => {
    // Listen for auth session updates from main process
    const removeListener = window.electronAPI.onAuthSessionUpdated(
      (_event, data) => {
        console.log('Received auth session update:', data)

        // Clear auth timeout if it exists
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current)
          authTimeoutRef.current = null
        }

        if (data.success) {
          console.log('Session updated with Firebase token')

          signInWithCustomToken(auth, data.firebaseToken)
            .then((cred) => {
              console.log('Signed into Firebase with custom token!')
              if (cred.user) {
                cred.user.getIdToken().then((idToken) => {
                  console.log('Firebase ID token for API calls:', idToken)
                })
              }
              setLoginLoading(false)
              setLoginProvider(null)
              setAuthError(null)
            })
            .catch((firebaseError) => {
              console.error('Firebase sign-in failed:', firebaseError)
              setLoginLoading(false)
              setLoginProvider(null)
              setAuthError('Firebase authentication failed')
            })
        } else {
          console.error('Auth session update failed:', data.error)
          setLoginLoading(false)
          setLoginProvider(null)
          setAuthError(data.error)
        }
      },
    )

    return () => {
      // Clear auth timeout on unmount if it exists
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current)
        authTimeoutRef.current = null
      }
      removeListener()
    }
  }, [])

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '',
          picture: firebaseUser.photoURL || undefined,
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const logout = async () => {
    try {
      // Clear all cached data from localStorage
      localStorage.clear()
      console.log('Cleared all cached data')

      await auth.signOut()
      await window.electronAPI.logout()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const logoutEverywhere = async () => {
    try {
      // Clear all cached data from localStorage
      localStorage.clear()
      console.log('Cleared all cached data')

      // Get Firebase ID token
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error('No authentication token available')
      }

      // Call main process to logout from backend
      const result = await window.electronAPI.logoutEverywhere(idToken)
      if (!result.success) {
        throw new Error(result.error || 'Backend logout failed')
      }

      // Sign out from Firebase
      await auth.signOut()

      setUser(null)
    } catch (error) {
      console.error('Global logout error:', error)
      // Even if backend logout fails, still sign out locally

      // Clear all cached data from localStorage
      localStorage.clear()

      await auth.signOut()
      setUser(null)
    }
  }

  const handleOAuthLogin = async (
    provider: 'google',
    authFn: () => Promise<AuthResult>,
  ) => {
    // Clear any existing timeout before starting new auth flow
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current)
      authTimeoutRef.current = null
    }

    setLoginLoading(true)
    setLoginProvider(provider)
    setAuthError(null)

    try {
      console.log(`Starting ${provider} OAuth via system browser...`)
      const result = await authFn()

      if (!result.success) {
        throw new Error(result.error)
      }

      if (!result.token) {
        throw new Error('Authentication failed - no token received')
      }

      try {
        const authData = JSON.parse(result.token)

        if (authData.status === 'pending') {
          console.log(`${provider} OAuth flow started!`)
          console.log('Waiting for completion in browser...')

          // Set timeout to clear loading state if auth takes too long (5 minutes)
          authTimeoutRef.current = setTimeout(() => {
            setLoginLoading(false)
            setLoginProvider(null)
            setAuthError('Authentication timed out. Please try again.')
          }, 5 * 60 * 1000)
        } else {
          console.log('Received legacy auth format - handling directly')
          throw new Error('Please use the updated authentication flow')
        }
      } catch (parseError) {
        console.error('Failed to parse auth response:', parseError)
        throw new Error('Authentication response format unexpected')
      }
    } catch (error: unknown) {
      console.error(`${provider} authentication error:`, error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Authentication failed. Please try again.'

      // Clear timeout on error
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current)
        authTimeoutRef.current = null
      }

      setLoginLoading(false)
      setLoginProvider(null)
      setAuthError(errorMessage)
    }
  }

  const loginWithGoogle = () =>
    handleOAuthLogin('google', window.electronAPI.authenticateWithGoogle)

  const cancelAuth = () => {
    // Clear auth timeout if it exists
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current)
      authTimeoutRef.current = null
    }

    setLoginLoading(false)
    setLoginProvider(null)
    setAuthError(null)
    console.log('Auth flow cancelled by user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authError,
        loginLoading,
        loginProvider,
        setUser,
        logout,
        logoutEverywhere,
        loginWithGoogle,
        cancelAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
