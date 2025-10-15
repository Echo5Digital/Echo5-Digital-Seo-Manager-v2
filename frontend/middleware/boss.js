import { useAuthStore } from '~/stores/auth'

/**
 * Role-based middleware
 * Restricts access to Boss-only routes
 */
export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  if (!authStore.isBoss) {
    return navigateTo('/dashboard')
  }
})
