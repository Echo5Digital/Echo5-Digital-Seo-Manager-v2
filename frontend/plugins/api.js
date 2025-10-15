import axios from 'axios'

/**
 * API Plugin
 * Creates axios instance with authentication
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  
  const api = axios.create({
    baseURL: `${config.public.apiUrl}/api`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor - add auth token
  api.interceptors.request.use(
    (config) => {
      if (process.client) {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor - handle errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        if (process.client) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          navigateTo('/login')
        }
      }
      return Promise.reject(error)
    }
  )

  // Provide axios instance to the app
  return {
    provide: {
      api,
    },
  }
})
