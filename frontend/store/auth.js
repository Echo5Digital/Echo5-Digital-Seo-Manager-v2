import { create } from 'zustand'

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false,

  // Initialize auth from localStorage
  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        try {
          set({
            token,
            user: JSON.parse(user),
            isAuthenticated: true,
            initialized: true
          })
        } catch (error) {
          console.error('Error parsing user data:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          set({ initialized: true })
        }
      } else {
        set({ initialized: true })
      }
    }
  },

  // Login
  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.status === 'success') {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        set({
          token: data.data.token,
          user: data.data.user,
          isAuthenticated: true,
          loading: false
        })
        return data.data
      } else {
        throw new Error(data.message || 'Login failed')
      }
    } catch (error) {
      set({
        error: error.message,
        loading: false
      })
      throw error
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({
      user: null,
      token: null,
      isAuthenticated: false
    })
  },

  // Clear error
  clearError: () => set({ error: null })
}))

export default useAuthStore
