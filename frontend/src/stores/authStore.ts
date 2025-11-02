import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

interface User {
  id: string
  username: string
  displayName?: string
  email: string
  role: UserRole
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isAdmin: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isAdmin: false,

      login: (token: string, user: User) => {
        localStorage.setItem('auth_token', token)
        const isAdmin = user.role === UserRole.ADMIN
        set({ isAuthenticated: true, user, token, isAdmin })
      },

      logout: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        set({ isAuthenticated: false, user: null, token: null, isAdmin: false })
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => {
          const updatedUser = state.user ? { ...state.user, ...userData } : null
          const isAdmin = updatedUser?.role === UserRole.ADMIN
          return {
            user: updatedUser,
            isAdmin
          }
        })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        isAdmin: state.isAdmin
      })
    }
  )
)
