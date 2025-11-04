import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import useAuthStore from '../store/auth'
import useNotificationsStore from '../store/notifications'
import { 
  BellIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  XMarkIcon,
  TrashIcon,
  DocumentTextIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

export default function Navbar() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const token = useAuthStore(state => state.token)
  const logout = useAuthStore(state => state.logout)
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotificationsStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const notificationRef = useRef(null)
  const previousUnreadCountRef = useRef(0)

  useEffect(() => {
    if (token) {
      fetchNotifications(token).catch(err => {
        console.error('Failed to fetch notifications:', err)
      })
      // Poll for new notifications every 5 seconds for real-time updates
      const interval = setInterval(() => {
        fetchNotifications(token).catch(err => {
          console.error('Failed to fetch notifications:', err)
        })
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [token, fetchNotifications])

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

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation() // Prevent triggering the notification click
    try {
      await deleteNotification(token, notificationId)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(token)
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  const getNotificationIcon = (type) => {
    const iconClass = "h-6 w-6"
    switch(type) {
      case 'Task Assigned':
        return <ClipboardDocumentListIcon className={`${iconClass} text-blue-600`} />
      case 'Task Update':
        return <ArrowPathIcon className={`${iconClass} text-indigo-600`} />
      case 'Audit Complete':
        return <CheckCircleIcon className={`${iconClass} text-green-600`} />
      case 'Rank Gain':
        return <ArrowTrendingUpIcon className={`${iconClass} text-emerald-600`} />
      case 'Rank Drop':
        return <ArrowTrendingDownIcon className={`${iconClass} text-red-600`} />
      case 'Blog Assigned':
        return <DocumentTextIcon className={`${iconClass} text-purple-600`} />
      case 'Blog Published':
        return <RocketLaunchIcon className={`${iconClass} text-green-600`} />
      case 'Alert':
        return <ExclamationTriangleIcon className={`${iconClass} text-yellow-600`} />
      default:
        return <BellAlertIcon className={`${iconClass} text-gray-600`} />
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
                            className={`p-4 cursor-pointer transition-colors relative group ${
                              notification.read 
                                ? 'bg-white hover:bg-gray-50' 
                                : 'bg-indigo-50 hover:bg-indigo-100'
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>
                              <div className="flex-1 min-w-0 pr-6">
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
                              {/* Delete button */}
                              <button
                                onClick={(e) => handleDeleteNotification(e, notification._id)}
                                className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                title="Delete notification"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Clear All button */}
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={handleClearAll}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Clear All Notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.role || 'Staff'}</p>
              </div>
              
              {/* User Avatar */}
              <div className="relative">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-gray-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200">
                    <UserCircleIcon className="h-6 w-6 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
