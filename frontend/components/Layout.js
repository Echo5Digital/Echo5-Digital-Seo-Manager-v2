import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useAuthStore from '../store/auth'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const publicPages = ['/login', '/']

  useEffect(() => {
    if (!isAuthenticated && !publicPages.includes(router.pathname)) {
      router.push('/login')
    }
  }, [isAuthenticated, router.pathname])

  // Don't show layout on login page
  if (publicPages.includes(router.pathname)) {
    return <>{children}</>
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
