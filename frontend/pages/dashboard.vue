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

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Keyword Rankings Trend -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Keyword Rankings Distribution</h2>
        <canvas ref="keywordChartRef" class="max-h-64"></canvas>
      </div>

      <!-- Task Completion Rate -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Task Status Distribution</h2>
        <canvas ref="taskChartRef" class="max-h-64"></canvas>
      </div>
    </div>

    <!-- SEO Score Trend -->
    <div class="card mb-6">
      <h2 class="text-xl font-semibold mb-4">Client SEO Scores</h2>
      <canvas ref="seoScoreChartRef" class="max-h-80"></canvas>
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
import { useTaskStore } from '~/stores/tasks'
import { useKeywordStore } from '~/stores/keywords'
import { Chart, registerables } from 'chart.js'

// Register Chart.js components
Chart.register(...registerables)

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()
const clientStore = useClientStore()
const taskStore = useTaskStore()
const keywordStore = useKeywordStore()

// Chart refs
const keywordChartRef = ref(null)
const taskChartRef = ref(null)
const seoScoreChartRef = ref(null)

let keywordChart = null
let taskChart = null
let seoScoreChart = null

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
const loading = ref(true)

// Create charts
const createKeywordChart = () => {
  if (!keywordChartRef.value) return
  
  const keywords = keywordStore.keywords
  const rankings = {
    'Top 3': keywords.filter(k => k.rankTracking?.currentRank && k.rankTracking.currentRank <= 3).length,
    '4-10': keywords.filter(k => k.rankTracking?.currentRank && k.rankTracking.currentRank >= 4 && k.rankTracking.currentRank <= 10).length,
    '11-20': keywords.filter(k => k.rankTracking?.currentRank && k.rankTracking.currentRank >= 11 && k.rankTracking.currentRank <= 20).length,
    '21-50': keywords.filter(k => k.rankTracking?.currentRank && k.rankTracking.currentRank >= 21 && k.rankTracking.currentRank <= 50).length,
    '50+': keywords.filter(k => k.rankTracking?.currentRank && k.rankTracking.currentRank > 50).length,
  }

  if (keywordChart) keywordChart.destroy()
  
  keywordChart = new Chart(keywordChartRef.value, {
    type: 'doughnut',
    data: {
      labels: Object.keys(rankings),
      datasets: [{
        data: Object.values(rankings),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // green
          'rgba(59, 130, 246, 0.8)',   // blue
          'rgba(234, 179, 8, 0.8)',    // yellow
          'rgba(249, 115, 22, 0.8)',   // orange
          'rgba(239, 68, 68, 0.8)',    // red
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value} keywords`;
            }
          }
        }
      }
    }
  })
}

const createTaskChart = () => {
  if (!taskChartRef.value) return
  
  const tasks = taskStore.tasks
  const taskStats = {
    'Pending': tasks.filter(t => t.status === 'Pending').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    'Completed': tasks.filter(t => t.status === 'Completed').length,
  }

  if (taskChart) taskChart.destroy()
  
  taskChart = new Chart(taskChartRef.value, {
    type: 'pie',
    data: {
      labels: Object.keys(taskStats),
      datasets: [{
        data: Object.values(taskStats),
        backgroundColor: [
          'rgba(234, 179, 8, 0.8)',    // yellow
          'rgba(59, 130, 246, 0.8)',   // blue
          'rgba(34, 197, 94, 0.8)',    // green
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  })
}

const createSeoScoreChart = () => {
  if (!seoScoreChartRef.value) return
  
  const clients = clientStore.clients.slice(0, 10) // Top 10 clients
  const labels = clients.map(c => c.name)
  const scores = clients.map(c => c.seoHealth?.score || 0)

  if (seoScoreChart) seoScoreChart.destroy()
  
  seoScoreChart = new Chart(seoScoreChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'SEO Score',
        data: scores,
        backgroundColor: scores.map(score => {
          if (score >= 80) return 'rgba(34, 197, 94, 0.8)'
          if (score >= 60) return 'rgba(234, 179, 8, 0.8)'
          if (score >= 40) return 'rgba(249, 115, 22, 0.8)'
          return 'rgba(239, 68, 68, 0.8)'
        }),
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => value + '%'
          }
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `Score: ${context.parsed.y}%`;
            }
          }
        }
      }
    }
  })
}

// Fetch dashboard data
onMounted(async () => {
  try {
    loading.value = true
    
    // Fetch all data in parallel
    await Promise.all([
      clientStore.fetchClients(),
      taskStore.fetchTasks(),
      keywordStore.fetchKeywords(),
    ])
    
    // Calculate real stats
    stats.value.totalClients = clientStore.clients.length
    stats.value.activeTasks = taskStore.pendingTasks.length + taskStore.inProgressTasks.length
    stats.value.totalKeywords = keywordStore.totalKeywords
    
    // Calculate average SEO score from clients
    const scores = clientStore.clients.map(c => c.seoScore || 0)
    stats.value.avgSeoScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : 0
    
    // Get recent data
    recentClients.value = clientStore.clients.slice(0, 5)
    pendingTasks.value = taskStore.pendingTasks.slice(0, 5)
    
    // Create charts after data is loaded
    nextTick(() => {
      createKeywordChart()
      createTaskChart()
      createSeoScoreChart()
    })
    
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
  } finally {
    loading.value = false
  }
})

// Cleanup charts on unmount
onBeforeUnmount(() => {
  if (keywordChart) keywordChart.destroy()
  if (taskChart) taskChart.destroy()
  if (seoScoreChart) seoScoreChart.destroy()
})
</script>
