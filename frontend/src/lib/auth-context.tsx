import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { api } from './api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: { email: string; password: string }) => Promise<void>
  signup: (payload: { first_name: string; last_name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const syncSession = async () => {
      try {
        const nextUser = await api.me()
        if (isMounted) {
          setUser(nextUser)
        }
      } catch {
        if (isMounted) {
          setUser(null)
          queryClient.clear()
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const handleUnauthorized = () => {
      setUser(null)
      setIsLoading(false)
      queryClient.clear()
    }

    window.addEventListener('wrms:unauthorized', handleUnauthorized)
    void syncSession()

    return () => {
      isMounted = false
      window.removeEventListener('wrms:unauthorized', handleUnauthorized)
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: async (payload) => {
        const session = await api.login(payload)
        setUser(session.user)
      },
      signup: async (payload) => {
        const session = await api.signup(payload)
        setUser(session.user)
      },
      logout: async () => {
        try {
          await api.logout()
        } finally {
          setUser(null)
          queryClient.clear()
        }
      },
    }),
    [isLoading, queryClient, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
