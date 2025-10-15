import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

/**
 * Authentication Store
 * Manages user authentication state and operations
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
  }),

  getters: {
    isBoss: (state) => state.user?.role === 'Boss',
    isStaff: (state) => state.user?.role === 'Staff',
    isDeveloper: (state) => state.user?.role === 'Developer',
    userRole: (state) => state.user?.role || null,
  },

  actions: {
    /**
     * Login user
     */
    async login(email, password) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const response = await $api.post('/auth/login', { email, password })
        
        if (response.data.status === 'success') {
          const { token, user } = response.data.data
          
          this.token = token
          this.user = user
          this.isAuthenticated = true
          
          // Store token in localStorage
          if (process.client) {
            localStorage.setItem('auth_token', token)
            localStorage.setItem('user', JSON.stringify(user))
          }
          
          return { success: true }
        }
      } catch (error) {
        console.error('Login error:', error)
        return {
          success: false,
          message: error.response?.data?.message || 'Login failed',
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * Logout user
     */
    logout() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      
      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      }
      
      navigateTo('/login')
    },

    /**
     * Check if user is authenticated (on app load)
     */
    checkAuth() {
      if (process.client) {
        const token = localStorage.getItem('auth_token')
        const user = localStorage.getItem('user')
        
        if (token && user) {
          this.token = token
          this.user = JSON.parse(user)
          this.isAuthenticated = true
        }
      }
    },

    /**
     * Update user profile
     */
    async updateProfile(data) {
      try {
        const { $api } = useNuxtApp()
        const response = await $api.put('/auth/update-profile', data)
        
        if (response.data.status === 'success') {
          this.user = response.data.data.user
          
          if (process.client) {
            localStorage.setItem('user', JSON.stringify(this.user))
          }
          
          return { success: true }
        }
      } catch (error) {
        console.error('Update profile error:', error)
        return {
          success: false,
          message: error.response?.data?.message || 'Update failed',
        }
      }
    },

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
      try {
        const { $api } = useNuxtApp()
        const response = await $api.put('/auth/change-password', {
          currentPassword,
          newPassword,
        })
        
        return { success: true, message: response.data.message }
      } catch (error) {
        console.error('Change password error:', error)
        return {
          success: false,
          message: error.response?.data?.message || 'Password change failed',
        }
      }
    },
  },
})
