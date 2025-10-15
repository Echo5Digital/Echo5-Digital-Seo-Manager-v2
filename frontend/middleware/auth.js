import { useAuthStore } from '~/stores/auth'

/**
 * Auth middleware
 * Protects routes that require authentication
 */
export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // Public routes
  const publicRoutes = ['/login', '/']
  
  if (!authStore.isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
  
  if (authStore.isAuthenticated && to.path === '/login') {
    return navigateTo('/dashboard')
  }
})
