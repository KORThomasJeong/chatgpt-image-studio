import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeApi, loginApi, logoutApi } from './api'

export interface User {
  id: number
  username: string
  is_admin: boolean
  has_custom_key: boolean
}

export interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('access_token'),
  )
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Validate stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    getMeApi()
      .then((me) => {
        setUser({
          id: me.id,
          username: me.username,
          is_admin: me.is_admin,
          has_custom_key: me.has_custom_key,
        })
        setToken(storedToken)
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        setToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(
    async (username: string, password: string): Promise<void> => {
      const data = await loginApi(username, password)
      // loginApi already stored the token in localStorage
      setToken(data.access_token)
      setUser({
        id: data.user_id,
        username: data.username,
        is_admin: data.is_admin,
        has_custom_key: data.has_custom_key,
      })
    },
    [],
  )

  const logout = useCallback(() => {
    logoutApi().catch(() => {
      // Ignore errors on logout — always clear local state
    })
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
