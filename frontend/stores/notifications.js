import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

/**
 * Notifications Store
 * Manages real-time notifications via Socket.io
 */
export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    socket: null,
    connected: false,
  }),

  getters: {
    unreadNotifications: (state) => state.notifications.filter(n => !n.read),
    recentNotifications: (state) => state.notifications.slice(0, 10),
  },

  actions: {
    /**
     * Connect to Socket.io
     */
    connectSocket(userId) {
      const config = useRuntimeConfig()
      
      if (!this.socket) {
        this.socket = io(config.public.socketUrl, {
          transports: ['websocket'],
        })

        this.socket.on('connect', () => {
          console.log('Socket connected')
          this.connected = true
          this.socket.emit('join-user-room', userId)
        })

        this.socket.on('disconnect', () => {
          console.log('Socket disconnected')
          this.connected = false
        })

        // Listen for notifications
        this.socket.on('notification', (notification) => {
          this.addNotification(notification)
        })
      }
    },

    /**
     * Disconnect socket
     */
    disconnectSocket() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.connected = false
      }
    },

    /**
     * Fetch notifications from API
     */
    async fetchNotifications() {
      try {
        const { $api } = useNuxtApp()
        const response = await $api.get('/notifications')
        
        if (response.data.status === 'success') {
          this.notifications = response.data.data.notifications
          this.unreadCount = response.data.data.unreadCount
        }
      } catch (error) {
        console.error('Fetch notifications error:', error)
      }
    },

    /**
     * Add new notification
     */
    addNotification(notification) {
      this.notifications.unshift(notification)
      if (!notification.read) {
        this.unreadCount++
      }
      
      // Show toast notification
      if (process.client) {
        // You can integrate a toast library here
        console.log('New notification:', notification.title)
      }
    },

    /**
     * Mark notification as read
     */
    async markAsRead(id) {
      try {
        const { $api } = useNuxtApp()
        await $api.put(`/notifications/${id}/read`)
        
        const notification = this.notifications.find(n => n._id === id)
        if (notification && !notification.read) {
          notification.read = true
          this.unreadCount--
        }
      } catch (error) {
        console.error('Mark as read error:', error)
      }
    },

    /**
     * Mark all as read
     */
    async markAllAsRead() {
      const unread = this.unreadNotifications
      
      for (const notification of unread) {
        await this.markAsRead(notification._id)
      }
    },
  },
})
