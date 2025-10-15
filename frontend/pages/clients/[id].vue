<template>
  <div v-if="client">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-4">
        <button @click="router.push('/clients')" class="text-gray-600 hover:text-gray-900">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900">{{ client.name }}</h1>
          <a :href="`https://${client.domain}`" target="_blank" class="text-blue-600 hover:underline">
            {{ client.domain }}
          </a>
        </div>
        <div>
          <span class="badge" :class="client.isActive ? 'badge-success' : 'badge-danger'">
            {{ client.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
    </div>

    <!-- SEO Health Score -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">SEO Health Score</h3>
        <div class="flex items-end gap-2">
          <span class="text-4xl font-bold" :class="getScoreColor(client.seoHealth?.score || 0)">
            {{ client.seoHealth?.score || 0 }}
          </span>
          <span class="text-gray-500 mb-2">/100</span>
        </div>
      </div>

      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Critical Issues</h3>
        <span class="text-4xl font-bold text-red-600">{{ client.seoHealth?.criticalIssues || 0 }}</span>
      </div>

      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">High Priority</h3>
        <span class="text-4xl font-bold text-orange-600">{{ client.seoHealth?.highIssues || 0 }}</span>
      </div>

      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Medium/Low</h3>
        <span class="text-4xl font-bold text-yellow-600">
          {{ (client.seoHealth?.mediumIssues || 0) + (client.seoHealth?.lowIssues || 0) }}
        </span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex gap-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="py-4 px-1 border-b-2 font-medium text-sm"
            :class="activeTab === tab.id 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content -->
    <div>
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Client Information -->
          <div class="card">
            <h3 class="text-lg font-semibold mb-4">Client Information</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-sm font-medium text-gray-500">Industry</dt>
                <dd class="text-sm text-gray-900">{{ client.industry || 'Not specified' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">CMS Platform</dt>
                <dd class="text-sm text-gray-900">{{ client.cms }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Created</dt>
                <dd class="text-sm text-gray-900">{{ formatDate(client.createdAt) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Last Audit</dt>
                <dd class="text-sm text-gray-900">
                  {{ client.seoHealth?.lastChecked ? formatDate(client.seoHealth.lastChecked) : 'Never' }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Contact Information -->
          <div class="card">
            <h3 class="text-lg font-semibold mb-4">Contact Information</h3>
            <dl class="space-y-3">
              <div v-if="client.contactInfo?.primaryContact">
                <dt class="text-sm font-medium text-gray-500">Primary Contact</dt>
                <dd class="text-sm text-gray-900">{{ client.contactInfo.primaryContact }}</dd>
              </div>
              <div v-if="client.contactInfo?.email">
                <dt class="text-sm font-medium text-gray-500">Email</dt>
                <dd class="text-sm text-gray-900">
                  <a :href="`mailto:${client.contactInfo.email}`" class="text-blue-600 hover:underline">
                    {{ client.contactInfo.email }}
                  </a>
                </dd>
              </div>
              <div v-if="client.contactInfo?.phone">
                <dt class="text-sm font-medium text-gray-500">Phone</dt>
                <dd class="text-sm text-gray-900">
                  <a :href="`tel:${client.contactInfo.phone}`" class="text-blue-600 hover:underline">
                    {{ client.contactInfo.phone }}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Assigned Staff -->
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Assigned Team Members</h3>
          <div v-if="client.assignedStaff && client.assignedStaff.length > 0" class="flex flex-wrap gap-2">
            <div v-for="staff in client.assignedStaff" :key="staff._id" class="badge badge-primary">
              {{ staff.name }}
            </div>
          </div>
          <p v-else class="text-gray-500 text-sm">No team members assigned</p>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button class="btn btn-primary">
              Run Audit
            </button>
            <button class="btn btn-secondary">
              Add Keywords
            </button>
            <button class="btn btn-secondary">
              Create Task
            </button>
            <button class="btn btn-secondary">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <!-- Keywords Tab -->
      <div v-if="activeTab === 'keywords'" class="space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Keywords ({{ clientKeywords.length }})</h3>
          <button @click="router.push('/keywords')" class="btn btn-primary btn-sm">
            Manage Keywords
          </button>
        </div>

        <div v-if="loadingKeywords" class="card text-center py-8">
          <p class="text-gray-500">Loading keywords...</p>
        </div>

        <div v-else-if="clientKeywords.length === 0" class="card text-center py-8">
          <p class="text-gray-500">No keywords tracked for this client</p>
          <button @click="router.push('/keywords')" class="btn btn-primary mt-4">
            Add Keywords
          </button>
        </div>

        <div v-else class="card overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Search Volume</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="keyword in clientKeywords" :key="keyword._id">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ keyword.keyword }}</td>
                <td class="px-4 py-3">
                  <span :class="getRankBadgeClass(keyword.currentPosition)">
                    #{{ keyword.currentPosition || 'N/A' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">{{ keyword.searchVolume?.toLocaleString() || 'N/A' }}</td>
                <td class="px-4 py-3">
                  <span :class="getDifficultyBadgeClass(keyword.difficulty)">
                    {{ keyword.difficulty }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tasks Tab -->
      <div v-if="activeTab === 'tasks'" class="space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Tasks ({{ clientTasks.length }})</h3>
          <button @click="router.push('/tasks')" class="btn btn-primary btn-sm">
            Manage Tasks
          </button>
        </div>

        <div v-if="loadingTasks" class="card text-center py-8">
          <p class="text-gray-500">Loading tasks...</p>
        </div>

        <div v-else-if="clientTasks.length === 0" class="card text-center py-8">
          <p class="text-gray-500">No tasks for this client</p>
          <button @click="router.push('/tasks')" class="btn btn-primary mt-4">
            Create Task
          </button>
        </div>

        <div v-else class="space-y-3">
          <div v-for="task in clientTasks" :key="task._id" class="card hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{{ task.title }}</h4>
                <p class="text-sm text-gray-600 mt-1">{{ task.description }}</p>
                <div class="flex gap-2 mt-2">
                  <span :class="getStatusBadgeClass(task.status)">{{ task.status }}</span>
                  <span :class="getPriorityBadgeClass(task.priority)">{{ task.priority }}</span>
                </div>
              </div>
              <div class="text-sm text-gray-500">
                {{ formatDate(task.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Audits Tab -->
      <div v-if="activeTab === 'audits'" class="space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">SEO Audits ({{ clientAudits.length }})</h3>
          <button @click="router.push('/audits')" class="btn btn-primary btn-sm">
            Run New Audit
          </button>
        </div>

        <div v-if="loadingAudits" class="card text-center py-8">
          <p class="text-gray-500">Loading audits...</p>
        </div>

        <div v-else-if="clientAudits.length === 0" class="card text-center py-8">
          <p class="text-gray-500">No audits yet for this client</p>
          <button @click="router.push('/audits')" class="btn btn-primary mt-4">
            Run First Audit
          </button>
        </div>

        <div v-else class="space-y-3">
          <div v-for="audit in clientAudits" :key="audit._id" class="card hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-4">
                  <div :class="getScoreColor(audit.score)" class="text-3xl font-bold">
                    {{ audit.score || 'N/A' }}
                  </div>
                  <div>
                    <a :href="audit.url" target="_blank" class="text-blue-600 hover:underline">
                      {{ audit.url }}
                    </a>
                    <p class="text-sm text-gray-500">{{ formatDate(audit.createdAt) }}</p>
                  </div>
                </div>
                <div v-if="audit.issues" class="flex gap-2 mt-2">
                  <span v-if="audit.issues.critical" class="badge badge-danger">
                    {{ audit.issues.critical }} Critical
                  </span>
                  <span v-if="audit.issues.warning" class="badge badge-warning">
                    {{ audit.issues.warning }} Warnings
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports Tab -->
      <div v-if="activeTab === 'reports'" class="space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Reports ({{ clientReports.length }})</h3>
          <button @click="router.push('/reports')" class="btn btn-primary btn-sm">
            Generate Report
          </button>
        </div>

        <div v-if="loadingReports" class="card text-center py-8">
          <p class="text-gray-500">Loading reports...</p>
        </div>

        <div v-else-if="clientReports.length === 0" class="card text-center py-8">
          <p class="text-gray-500">No reports generated yet</p>
          <button @click="router.push('/reports')" class="btn btn-primary mt-4">
            Generate First Report
          </button>
        </div>

        <div v-else class="space-y-3">
          <div v-for="report in clientReports" :key="report._id" class="card hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{{ report.type }}</h4>
                <p class="text-sm text-gray-600 mt-1">
                  {{ formatDateRange(report.dateRange) }}
                </p>
                <div class="flex gap-4 mt-2 text-sm">
                  <div v-if="report.metrics?.organicTraffic">
                    <span class="text-gray-500">Traffic:</span>
                    <span class="font-semibold ml-1">{{ report.metrics.organicTraffic.toLocaleString() }}</span>
                  </div>
                  <div v-if="report.metrics?.avgPosition">
                    <span class="text-gray-500">Avg Position:</span>
                    <span class="font-semibold ml-1">{{ report.metrics.avgPosition }}</span>
                  </div>
                </div>
              </div>
              <div class="text-sm text-gray-500">
                {{ formatDate(report.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="card">
        <h3 class="text-lg font-semibold mb-4">Client Settings</h3>
        
        <form @submit.prevent="updateSettings" class="space-y-6">
          <div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="client.settings.autoAudit" class="rounded">
              <span class="text-sm font-medium">Enable Automatic Audits</span>
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Audit Frequency</label>
            <select v-model="client.settings.auditFrequency" class="input">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="client.settings.rankTrackingEnabled" class="rounded">
              <span class="text-sm font-medium">Enable Rank Tracking</span>
            </label>
          </div>

          <div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="client.settings.emailNotifications" class="rounded">
              <span class="text-sm font-medium">Email Notifications</span>
            </label>
          </div>

          <div class="pt-4 border-t">
            <button type="submit" class="btn btn-primary">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else class="flex justify-center items-center py-12">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
</template>

<script setup>
import { useClientStore } from '~/stores/clients'
import { useKeywordStore } from '~/stores/keywords'
import { useTaskStore } from '~/stores/tasks'
import { useAuditStore } from '~/stores/audits'
import { useReportStore } from '~/stores/reports'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const clientStore = useClientStore()
const keywordStore = useKeywordStore()
const taskStore = useTaskStore()
const auditStore = useAuditStore()
const reportStore = useReportStore()

const client = ref(null)
const activeTab = ref('overview')
const loadingKeywords = ref(false)
const loadingTasks = ref(false)
const loadingAudits = ref(false)
const loadingReports = ref(false)

const tabs = [
  { id: 'overview', name: 'Overview' },
  { id: 'keywords', name: 'Keywords' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'audits', name: 'Audits' },
  { id: 'reports', name: 'Reports' },
  { id: 'settings', name: 'Settings' },
]

// Computed properties for client-specific data
const clientKeywords = computed(() => {
  if (!client.value) return []
  return keywordStore.keywords.filter(k => k.clientId === client.value._id)
})

const clientTasks = computed(() => {
  if (!client.value) return []
  return taskStore.tasks.filter(t => t.clientId === client.value._id)
})

const clientAudits = computed(() => {
  if (!client.value) return []
  return auditStore.audits.filter(a => a.clientId === client.value._id)
})

const clientReports = computed(() => {
  if (!client.value) return []
  return reportStore.reports.filter(r => r.clientId === client.value._id)
})

// Watch for tab changes and load data
watch(activeTab, async (newTab) => {
  if (!client.value) return
  
  try {
    switch(newTab) {
      case 'keywords':
        loadingKeywords.value = true
        await keywordStore.fetchKeywords()
        loadingKeywords.value = false
        break
      case 'tasks':
        loadingTasks.value = true
        await taskStore.fetchTasks()
        loadingTasks.value = false
        break
      case 'audits':
        loadingAudits.value = true
        await auditStore.fetchAudits()
        loadingAudits.value = false
        break
      case 'reports':
        loadingReports.value = true
        await reportStore.fetchReports()
        loadingReports.value = false
        break
    }
  } catch (error) {
    console.error(`Error loading ${newTab} data:`, error)
  }
})

// Fetch client data
onMounted(async () => {
  const clientId = route.params.id
  client.value = await clientStore.fetchClient(clientId)
})

// Helper functions
const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateRange = (dateRange) => {
  if (!dateRange) return 'N/A'
  const start = new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end = new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${start} - ${end}`
}

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
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

const getStatusBadgeClass = (status) => {
  const classes = {
    'Pending': 'badge badge-warning',
    'In Progress': 'badge badge-info',
    'Completed': 'badge badge-success'
  }
  return classes[status] || 'badge badge-secondary'
}

const getPriorityBadgeClass = (priority) => {
  const classes = {
    'Low': 'badge badge-secondary',
    'Medium': 'badge badge-warning',
    'High': 'badge badge-danger'
  }
  return classes[priority] || 'badge badge-secondary'
}

const updateSettings = async () => {
  const { $api } = useNuxtApp()
  try {
    await $api.put(`/clients/${client.value._id}`, {
      settings: client.value.settings
    })
    alert('Settings updated successfully!')
  } catch (error) {
    console.error('Error updating settings:', error)
    alert('Failed to update settings')
  }
}
</script>
