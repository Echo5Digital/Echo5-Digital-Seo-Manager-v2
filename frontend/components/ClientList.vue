<template>
  <div class="space-y-3">
    <div
      v-for="client in displayClients"
      :key="client._id"
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
      @click="navigateTo(`/clients/${client._id}`)"
    >
      <div class="flex-1">
        <h4 class="font-medium text-gray-900">{{ client.name }}</h4>
        <p class="text-sm text-gray-500">{{ client.domain }}</p>
      </div>
      <div class="text-right">
        <span class="text-2xl font-bold" :class="getScoreColor(client.seoHealth?.score || 0)">
          {{ client.seoHealth?.score || 0 }}
        </span>
      </div>
    </div>
    <div v-if="displayClients.length === 0" class="text-center py-4 text-gray-500">
      No clients yet
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  clients: {
    type: Array,
    default: () => []
  },
  limit: {
    type: Number,
    default: 5
  }
})

const displayClients = computed(() => {
  return props.clients.slice(0, props.limit)
})

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}
</script>
