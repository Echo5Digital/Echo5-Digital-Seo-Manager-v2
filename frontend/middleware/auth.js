import { useAuthStore } from '~/stores/auth'

/**
 * Auth middleware
 * Protects routes that require authentication
 */
export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // Check auth from localStorage before checking state
  if (process.client) {
    const token = localStorage.getItem('auth_token')
    const user = localStorage.getItem('user')
    
    if (token && user && !authStore.isAuthenticated) {
      authStore.token = token
      authStore.user = JSON.parse(user)
      authStore.isAuthenticated = true
    }
  }

  // Public routes
  const publicRoutes = ['/login', '/']
  
  if (!authStore.isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
  
  if (authStore.isAuthenticated && to.path === '/login') {
    return navigateTo('/dashboard')
  }
})
