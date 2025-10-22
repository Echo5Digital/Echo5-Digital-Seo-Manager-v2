import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import useAuthStore from '../store/auth'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const initialized = useAuthStore(state => state.initialized)
  const initAuth = useAuthStore(state => state.initAuth)
  const publicPages = ['/login', '/']
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Initialize auth on mount
    if (!initialized) {
      initAuth()
    }
  }, [initialized, initAuth])

  useEffect(() => {
    // Only check authentication after initialization
    if (initialized) {
      setIsChecking(false)
      if (!isAuthenticated && !publicPages.includes(router.pathname)) {
        router.push('/login')
      }
    }
  }, [isAuthenticated, initialized, router.pathname])

  // Don't show layout on login page
  if (publicPages.includes(router.pathname)) {
    return <>{children}</>
  }

  // Show loading while checking authentication
  if (isChecking || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
