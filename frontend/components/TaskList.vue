<template>
  <div class="space-y-3">
    <div
      v-for="task in displayTasks"
      :key="task.id"
      class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
    >
      <div class="flex-shrink-0">
        <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="getPriorityBg(task.priority)">
          <span class="text-xs font-bold" :class="getPriorityText(task.priority)">
            {{ task.priority?.charAt(0) || 'M' }}
          </span>
        </div>
      </div>
      <div class="flex-1">
        <h4 class="font-medium text-gray-900 text-sm">{{ task.title }}</h4>
        <p class="text-xs text-gray-500">{{ task.client || 'General' }}</p>
      </div>
      <div>
        <span class="badge" :class="getStatusBadge(task.status)">
          {{ task.status }}
        </span>
      </div>
    </div>
    <div v-if="displayTasks.length === 0" class="text-center py-4 text-gray-500">
      No pending tasks
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  limit: {
    type: Number,
    default: 5
  }
})

const displayTasks = computed(() => {
  return props.tasks.slice(0, props.limit)
})

const getPriorityBg = (priority) => {
  const map = {
    High: 'bg-red-100',
    Medium: 'bg-yellow-100',
    Low: 'bg-green-100'
  }
  return map[priority] || 'bg-gray-100'
}

const getPriorityText = (priority) => {
  const map = {
    High: 'text-red-700',
    Medium: 'text-yellow-700',
    Low: 'text-green-700'
  }
  return map[priority] || 'text-gray-700'
}

const getStatusBadge = (status) => {
  const map = {
    'In Progress': 'badge-primary',
    'Pending': 'badge-warning',
    'Completed': 'badge-success'
  }
  return map[status] || 'badge-warning'
}
</script>
