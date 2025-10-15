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
      <div v-if="activeTab === 'keywords'" class="card">
        <h3 class="text-lg font-semibold mb-4">Keywords</h3>
        <p class="text-gray-500">Keyword tracking coming soon...</p>
      </div>

      <!-- Tasks Tab -->
      <div v-if="activeTab === 'tasks'" class="card">
        <h3 class="text-lg font-semibold mb-4">Tasks</h3>
        <p class="text-gray-500">Task management coming soon...</p>
      </div>

      <!-- Audits Tab -->
      <div v-if="activeTab === 'audits'" class="card">
        <h3 class="text-lg font-semibold mb-4">SEO Audits</h3>
        <p class="text-gray-500">Audit history coming soon...</p>
      </div>

      <!-- Reports Tab -->
      <div v-if="activeTab === 'reports'" class="card">
        <h3 class="text-lg font-semibold mb-4">Reports</h3>
        <p class="text-gray-500">Reports coming soon...</p>
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

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const clientStore = useClientStore()

const client = ref(null)
const activeTab = ref('overview')

const tabs = [
  { id: 'overview', name: 'Overview' },
  { id: 'keywords', name: 'Keywords' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'audits', name: 'Audits' },
  { id: 'reports', name: 'Reports' },
  { id: 'settings', name: 'Settings' },
]

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

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
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
