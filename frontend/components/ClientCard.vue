<template>
  <div class="card hover:shadow-lg transition-shadow cursor-pointer" @click="$emit('click')">
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ client.name }}</h3>
        <a
          :href="`https://${client.domain}`"
          target="_blank"
          class="text-sm text-primary-600 hover:underline"
          @click.stop
        >
          {{ client.domain }}
        </a>
      </div>
      
      <span
        :class="healthBadgeClass"
        class="badge"
      >
        {{ client.seoHealth?.score || 0 }}
      </span>
    </div>

    <div class="space-y-2 mb-4">
      <div class="flex items-center text-sm text-gray-600">
        <span class="mr-2">📁</span>
        <span>{{ client.cms || 'N/A' }}</span>
      </div>
      
      <div class="flex items-center text-sm text-gray-600">
        <span class="mr-2">🏢</span>
        <span>{{ client.industry || 'N/A' }}</span>
      </div>
      
      <div v-if="client.assignedStaff?.length" class="flex items-center text-sm text-gray-600">
        <span class="mr-2">👤</span>
        <span>{{ client.assignedStaff.length }} staff assigned</span>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2 pt-4 border-t border-gray-200">
      <div class="text-center">
        <p class="text-xs text-gray-500">Critical</p>
        <p class="text-lg font-semibold text-danger-600">{{ client.seoHealth?.criticalIssues || 0 }}</p>
      </div>
      <div class="text-center">
        <p class="text-xs text-gray-500">High</p>
        <p class="text-lg font-semibold text-warning-600">{{ client.seoHealth?.highIssues || 0 }}</p>
      </div>
      <div class="text-center">
        <p class="text-xs text-gray-500">Medium</p>
        <p class="text-lg font-semibold text-primary-600">{{ client.seoHealth?.mediumIssues || 0 }}</p>
      </div>
      <div class="text-center">
        <p class="text-xs text-gray-500">Low</p>
        <p class="text-lg font-semibold text-gray-600">{{ client.seoHealth?.lowIssues || 0 }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  client: {
    type: Object,
    required: true,
  },
})

defineEmits(['click'])

const healthBadgeClass = computed(() => {
  const score = props.client.seoHealth?.score || 0
  if (score >= 80) return 'badge-success'
  if (score >= 60) return 'badge-warning'
  return 'badge-danger'
})
</script>
