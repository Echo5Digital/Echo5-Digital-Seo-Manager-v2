<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-600 mt-1">Welcome back, {{ authStore.user?.name }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Clients"
        :value="stats.totalClients"
        icon="users"
        color="primary"
      />
      <StatCard
        title="Active Tasks"
        :value="stats.activeTasks"
        icon="clipboard"
        color="warning"
      />
      <StatCard
        title="Keywords Tracked"
        :value="stats.totalKeywords"
        icon="search"
        color="success"
      />
      <StatCard
        title="Avg SEO Score"
        :value="stats.avgSeoScore"
        icon="chart"
        color="primary"
      />
    </div>

    <!-- Recent Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Recent Clients</h2>
        <ClientList :clients="recentClients" :limit="5" />
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Pending Tasks</h2>
        <TaskList :tasks="pendingTasks" :limit="5" />
      </div>
    </div>

    <!-- Notifications -->
    <div v-if="authStore.isBoss" class="mt-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Recent Alerts</h2>
        <NotificationList :notifications="recentNotifications" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useClientStore } from '~/stores/clients'

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()
const clientStore = useClientStore()

// Dashboard stats
const stats = ref({
  totalClients: 0,
  activeTasks: 0,
  totalKeywords: 0,
  avgSeoScore: 0,
})

const recentClients = ref([])
const pendingTasks = ref([])
const recentNotifications = ref([])

// Fetch dashboard data
onMounted(async () => {
  await clientStore.fetchClients()
  
  // Calculate stats
  stats.value.totalClients = clientStore.clients.length
  
  // Mock data - replace with actual API calls
  stats.value.activeTasks = 24
  stats.value.totalKeywords = 156
  stats.value.avgSeoScore = 78
  
  recentClients.value = clientStore.clients.slice(0, 5)
})
</script>
