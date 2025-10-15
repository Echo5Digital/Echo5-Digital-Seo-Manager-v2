<template>
  <div class="space-y-3">
    <div
      v-for="notification in displayNotifications"
      :key="notification.id"
      class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
    >
      <div class="flex-shrink-0">
        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <span class="text-blue-600">🔔</span>
        </div>
      </div>
      <div class="flex-1">
        <h4 class="font-medium text-gray-900 text-sm">{{ notification.title }}</h4>
        <p class="text-xs text-gray-500">{{ notification.message }}</p>
        <span class="text-xs text-gray-400">{{ formatTime(notification.createdAt) }}</span>
      </div>
    </div>
    <div v-if="displayNotifications.length === 0" class="text-center py-4 text-gray-500">
      No notifications
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  notifications: {
    type: Array,
    default: () => []
  }
})

const displayNotifications = computed(() => {
  return props.notifications.slice(0, 5)
})

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000 / 60) // minutes
  
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}
</script>
