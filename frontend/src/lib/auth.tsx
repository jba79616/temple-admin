import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from '../api'
import type { Me } from '../api/types'

interface AuthState {
  me: Me | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.me().then(setMe).catch(() => setMe(null)).finally(() => setLoading(false))
    const onUnauthorized = () => setMe(null)
    window.addEventListener('temple:unauthorized', onUnauthorized)
    return () => window.removeEventListener('temple:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setMe(await auth.login(username, password))
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    setMe(null)
  }, [])

  const value = useMemo(() => ({ me, loading, login, logout }), [me, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 內使用')
  return ctx
}
