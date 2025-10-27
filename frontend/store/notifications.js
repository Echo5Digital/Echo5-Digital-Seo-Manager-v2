import { create } from 'zustand'

const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Fetch notifications
  fetchNotifications: async (token) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()

      if (data.status === 'success') {
        set({ 
          notifications: data.data.notifications,
          unreadCount: data.data.unreadCount,
          loading: false 
        })
        return data.data
      } else {
        throw new Error(data.message || 'Failed to fetch notifications')
      }
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Mark notification as read
  markAsRead: async (token, notificationId) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()

      if (data.status === 'success') {
        set((state) => ({
          notifications: state.notifications.map((notif) =>
            notif._id === notificationId ? { ...notif, read: true, readAt: new Date() } : notif
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }))
        return data.data.notification
      } else {
        throw new Error(data.message || 'Failed to mark notification as read')
      }
    } catch (error) {
      throw error
    }
  },

  // Mark all as read
  markAllAsRead: async (token) => {
    const { notifications } = get()
    const unreadNotifications = notifications.filter(n => !n.read)
    
    try {
      await Promise.all(
        unreadNotifications.map(notif => 
          get().markAsRead(token, notif._id)
        )
      )
    } catch (error) {
      throw error
    }
  },
}))

export default useNotificationsStore
