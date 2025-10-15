<template>
  <header class="fixed top-0 right-0 left-0 lg:left-64 z-40 bg-white border-b border-gray-200 h-16">
    <div class="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
      <!-- Search -->
      <div class="flex-1 max-w-lg">
        <input
          type="search"
          placeholder="Search clients, tasks..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- Right side -->
      <div class="flex items-center space-x-4">
        <!-- Notifications -->
        <button
          @click="showNotifications = !showNotifications"
          class="relative p-2 text-gray-600 hover:text-gray-900"
        >
          <BellIcon class="w-6 h-6" />
          <span
            v-if="notificationStore.unreadCount > 0"
            class="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          >
            {{ notificationStore.unreadCount }}
          </span>
        </button>

        <!-- User Menu -->
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-700">{{ authStore.user?.name }}</span>
          <span class="badge badge-primary">{{ authStore.user?.role }}</span>
        </div>
      </div>
    </div>

    <!-- Notifications Dropdown -->
    <div
      v-if="showNotifications"
      class="absolute right-4 top-16 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto"
    >
      <div class="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="font-semibold">Notifications</h3>
        <button
          v-if="notificationStore.unreadCount > 0"
          @click="markAllAsRead"
          class="text-xs text-blue-600 hover:text-blue-700"
        >
          Mark all read
        </button>
      </div>
      
      <div v-if="notificationStore.notifications.length === 0" class="p-4 text-center text-gray-500">
        No notifications
      </div>
      
      <div v-else>
        <div
          v-for="notification in notificationStore.recentNotifications"
          :key="notification._id"
          class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          :class="{ 'bg-blue-50': !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <p class="font-medium text-sm">{{ notification.title }}</p>
          <p class="text-xs text-gray-600 mt-1">{{ notification.message }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ formatDate(notification.createdAt) }}</p>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { BellIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '~/stores/auth'
import { useNotificationStore } from '~/stores/notifications'
import { formatDistanceToNow } from 'date-fns'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const showNotifications = ref(false)

onMounted(() => {
  notificationStore.fetchNotifications()
  notificationStore.connectSocket(authStore.user?._id)
})

onBeforeUnmount(() => {
  notificationStore.disconnectSocket()
})

const handleNotificationClick = async (notification) => {
  await notificationStore.markAsRead(notification._id)
  showNotifications.value = false
  
  // Navigate to related page if actionUrl exists
  if (notification.actionUrl) {
    navigateTo(notification.actionUrl)
  }
}

const markAllAsRead = async () => {
  await notificationStore.markAllAsRead()
}

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
</script>
