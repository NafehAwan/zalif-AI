import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  email: string
  name: string
  apiKey?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateApiKey: (key: string) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('zalifai_user')
    if (saved) setUser(JSON.parse(saved))
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const users: Record<string, User & { password: string }> = JSON.parse(
      localStorage.getItem('zalifai_users') || '{}'
    )
    const found = Object.values(users).find(u => u.email === email && u.password === password)
    if (!found) throw new Error('Invalid email or password')
    const { password: _, ...u } = found
    setUser(u)
    localStorage.setItem('zalifai_user', JSON.stringify(u))
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const users: Record<string, User & { password: string }> = JSON.parse(
      localStorage.getItem('zalifai_users') || '{}'
    )
    if (Object.values(users).find(u => u.email === email)) throw new Error('Email already exists')
    const id = crypto.randomUUID()
    const newUser = { id, name, email, password }
    users[id] = newUser
    localStorage.setItem('zalifai_users', JSON.stringify(users))
    const { password: _, ...u } = newUser
    setUser(u)
    localStorage.setItem('zalifai_user', JSON.stringify(u))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('zalifai_user')
  }, [])

  const updateApiKey = useCallback((key: string) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, apiKey: key }
      localStorage.setItem('zalifai_user', JSON.stringify(updated))
      const users = JSON.parse(localStorage.getItem('zalifai_users') || '{}')
      if (users[prev.id]) {
        users[prev.id] = { ...users[prev.id], apiKey: key }
        localStorage.setItem('zalifai_users', JSON.stringify(users))
      }
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateApiKey, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
