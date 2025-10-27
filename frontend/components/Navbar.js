import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import useAuthStore from '../store/auth'
import useNotificationsStore from '../store/notifications'
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const token = useAuthStore(state => state.token)
  const logout = useAuthStore(state => state.logout)
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationsStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const notificationRef = useRef(null)
  const previousUnreadCountRef = useRef(0)

  useEffect(() => {
    if (token) {
      fetchNotifications(token)
      // Poll for new notifications every 5 seconds for real-time updates
      const interval = setInterval(() => {
        fetchNotifications(token)
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [token])

  // Detect new notifications and trigger animation
  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current) {
      setHasNewNotification(true)
      // Play notification sound (optional)
      // new Audio('/notification.mp3').play().catch(() => {})
      
      // Remove animation after 2 seconds
      setTimeout(() => {
        setHasNewNotification(false)
      }, 2000)
    }
    previousUnreadCountRef.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(token, notification._id)
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'Task Assigned':
        return '📋'
      case 'Audit Complete':
        return '✅'
      case 'Rank Gain':
        return '📈'
      case 'Rank Drop':
        return '📉'
      case 'Alert':
        return '⚠️'
      default:
        return '🔔'
    }
  }

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              SEO Management Platform
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative" ref={notificationRef}>
              <button 
                className={`p-2 text-gray-400 hover:text-gray-500 relative transition-all ${
                  hasNewNotification ? 'animate-bounce' : ''
                }`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className={`absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[18px] ${
                    hasNewNotification ? 'animate-pulse' : ''
                  }`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead(token)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <div
                            key={notification._id}
                            className={`p-4 cursor-pointer transition-colors ${
                              notification.read 
                                ? 'bg-white hover:bg-gray-50' 
                                : 'bg-indigo-50 hover:bg-indigo-100'
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex gap-3">
                              <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {getTimeAgo(notification.createdAt)}
                                  </span>
                                  {!notification.read && (
                                    <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.role || 'Staff'}</p>
              </div>
              <div className="relative">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  <UserCircleIcon className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
