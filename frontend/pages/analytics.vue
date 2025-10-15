<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Analytics</h1>
      <p class="text-gray-600 mt-1">Advanced analytics and insights across all clients</p>
    </div>

    <!-- Date Range Filter -->
    <div class="card mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
          <select v-model="selectedPeriod" @change="handlePeriodChange" class="input">
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select v-model="selectedClient" class="input">
            <option value="">All Clients</option>
            <option v-for="client in clients" :key="client._id" :value="client._id">
              {{ client.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Keywords</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ filteredKeywords.length }}</p>
            <p class="text-xs text-green-600 mt-1">Tracking</p>
          </div>
          <MagnifyingGlassIcon class="w-12 h-12 text-blue-500" />
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Avg. Position</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ avgPosition }}</p>
            <p class="text-xs text-gray-500 mt-1">Current ranking</p>
          </div>
          <ChartBarIcon class="w-12 h-12 text-green-500" />
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Top 10 Rankings</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ top10Count }}</p>
            <p class="text-xs text-green-600 mt-1">{{ top10Percentage }}% of total</p>
          </div>
          <TrophyIcon class="w-12 h-12 text-yellow-500" />
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Active Tasks</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ activeTasks }}</p>
            <p class="text-xs text-blue-600 mt-1">In progress</p>
          </div>
          <CheckCircleIcon class="w-12 h-12 text-purple-500" />
        </div>
      </div>
    </div>

    <!-- Keyword Performance by Difficulty -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Keywords by Difficulty</h3>
        <div class="space-y-3">
          <div v-for="diff in difficultyStats" :key="diff.name" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div :class="['w-3 h-3 rounded-full', diff.color]"></div>
              <span class="text-sm text-gray-700">{{ diff.name }}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm font-semibold text-gray-900">{{ diff.count }}</span>
              <div class="w-32 bg-gray-200 rounded-full h-2">
                <div :class="['h-2 rounded-full', diff.bgColor]" :style="`width: ${diff.percentage}%`"></div>
              </div>
              <span class="text-xs text-gray-500 w-12 text-right">{{ diff.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Ranking Distribution</h3>
        <div class="space-y-3">
          <div v-for="rank in rankingStats" :key="rank.name" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div :class="['w-3 h-3 rounded-full', rank.color]"></div>
              <span class="text-sm text-gray-700">{{ rank.name }}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm font-semibold text-gray-900">{{ rank.count }}</span>
              <div class="w-32 bg-gray-200 rounded-full h-2">
                <div :class="['h-2 rounded-full', rank.bgColor]" :style="`width: ${rank.percentage}%`"></div>
              </div>
              <span class="text-xs text-gray-500 w-12 text-right">{{ rank.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Performing Keywords -->
    <div class="card mb-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Performing Keywords</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Search Volume</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="keyword in topKeywords" :key="keyword._id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ keyword.keyword }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ getClientName(keyword.clientId) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getRankBadgeClass(keyword.rankTracking?.currentRank)">
                  #{{ keyword.rankTracking?.currentRank || 'N/A' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ keyword.volume?.toLocaleString() || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getDifficultyBadgeClass(keyword.competition)">
                  {{ keyword.competition }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Client Performance Comparison -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Client Performance Overview</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Keywords</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Top 10</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Position</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Tasks</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="stat in clientStats" :key="stat.clientId">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ stat.clientName }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ stat.totalKeywords }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ stat.top10 }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ stat.avgPosition }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ stat.activeTasks }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  ChartPieIcon, 
  MagnifyingGlassIcon, 
  ChartBarIcon, 
  CheckCircleIcon,
  TrophyIcon 
} from '@heroicons/vue/24/outline'
import { useKeywordStore } from '~/stores/keywords'
import { useClientStore } from '~/stores/clients'
import { useTaskStore } from '~/stores/tasks'

definePageMeta({
  middleware: ['auth'],
})

const keywordStore = useKeywordStore()
const clientStore = useClientStore()
const taskStore = useTaskStore()

const selectedPeriod = ref('30')
const selectedClient = ref('')
const loading = ref(true)

const clients = computed(() => clientStore.clients)
const keywords = computed(() => keywordStore.keywords)
const tasks = computed(() => taskStore.tasks)

const filteredKeywords = computed(() => {
  if (!selectedClient.value) return keywords.value
  return keywords.value.filter(k => k.clientId === selectedClient.value)
})

const avgPosition = computed(() => {
  if (filteredKeywords.value.length === 0) return 'N/A'
  const sum = filteredKeywords.value.reduce((acc, k) => acc + (k.rankTracking?.currentRank || 0), 0)
  return (sum / filteredKeywords.value.length).toFixed(1)
})

const top10Count = computed(() => {
  return filteredKeywords.value.filter(k => k.rankTracking?.currentRank && k.rankTracking.currentRank <= 10).length
})

const top10Percentage = computed(() => {
  if (filteredKeywords.value.length === 0) return 0
  return ((top10Count.value / filteredKeywords.value.length) * 100).toFixed(0)
})

const activeTasks = computed(() => {
  const filtered = selectedClient.value 
    ? tasks.value.filter(t => t.clientId === selectedClient.value)
    : tasks.value
  return filtered.filter(t => t.status !== 'Completed').length
})

const difficultyStats = computed(() => {
  const stats = [
    { name: 'Low', count: 0, color: 'bg-green-500', bgColor: 'bg-green-500' },
    { name: 'Medium', count: 0, color: 'bg-yellow-500', bgColor: 'bg-yellow-500' },
    { name: 'High', count: 0, color: 'bg-red-500', bgColor: 'bg-red-500' }
  ]
  
  filteredKeywords.value.forEach(k => {
    const diff = stats.find(s => s.name === k.competition)
    if (diff) diff.count++
  })
  
  const total = filteredKeywords.value.length || 1
  stats.forEach(s => s.percentage = ((s.count / total) * 100).toFixed(0))
  
  return stats
})

const rankingStats = computed(() => {
  const stats = [
    { name: 'Rank 1-3', count: 0, color: 'bg-green-500', bgColor: 'bg-green-500' },
    { name: 'Rank 4-10', count: 0, color: 'bg-blue-500', bgColor: 'bg-blue-500' },
    { name: 'Rank 11-20', count: 0, color: 'bg-yellow-500', bgColor: 'bg-yellow-500' },
    { name: 'Rank 20+', count: 0, color: 'bg-red-500', bgColor: 'bg-red-500' }
  ]
  
  filteredKeywords.value.forEach(k => {
    const pos = k.rankTracking?.currentRank || 100
    if (pos <= 3) stats[0].count++
    else if (pos <= 10) stats[1].count++
    else if (pos <= 20) stats[2].count++
    else stats[3].count++
  })
  
  const total = filteredKeywords.value.length || 1
  stats.forEach(s => s.percentage = ((s.count / total) * 100).toFixed(0))
  
  return stats
})

const topKeywords = computed(() => {
  return [...filteredKeywords.value]
    .filter(k => k.rankTracking?.currentRank)
    .sort((a, b) => (a.rankTracking?.currentRank || 100) - (b.rankTracking?.currentRank || 100))
    .slice(0, 10)
})

const clientStats = computed(() => {
  return clients.value.map(client => {
    const clientKeywords = keywords.value.filter(k => k.clientId === client._id)
    const clientTasks = tasks.value.filter(t => t.clientId === client._id)
    const top10 = clientKeywords.filter(k => k.rankTracking?.currentRank && k.rankTracking.currentRank <= 10).length
    const sum = clientKeywords.reduce((acc, k) => acc + (k.rankTracking?.currentRank || 0), 0)
    const avg = clientKeywords.length > 0 ? (sum / clientKeywords.length).toFixed(1) : 'N/A'
    
    return {
      clientId: client._id,
      clientName: client.name,
      totalKeywords: clientKeywords.length,
      top10,
      avgPosition: avg,
      activeTasks: clientTasks.filter(t => t.status !== 'Completed').length
    }
  })
})

const getClientName = (clientId) => {
  const client = clients.value.find(c => c._id === clientId)
  return client?.name || 'Unknown'
}

const getRankBadgeClass = (position) => {
  if (!position) return 'badge badge-secondary'
  if (position <= 3) return 'badge badge-success'
  if (position <= 10) return 'badge badge-info'
  if (position <= 20) return 'badge badge-warning'
  return 'badge badge-danger'
}

const getDifficultyBadgeClass = (difficulty) => {
  const classes = {
    'Low': 'badge badge-success',
    'Medium': 'badge badge-warning',
    'High': 'badge badge-danger'
  }
  return classes[difficulty] || 'badge badge-secondary'
}

const handlePeriodChange = () => {
  // In a real app, this would filter data by date range
  console.log('Period changed to:', selectedPeriod.value)
}

onMounted(async () => {
  try {
    await Promise.all([
      clientStore.fetchClients(),
      keywordStore.fetchKeywords(),
      taskStore.fetchTasks()
    ])
  } catch (error) {
    console.error('Error loading analytics data:', error)
  } finally {
    loading.value = false
  }
})
</script>
