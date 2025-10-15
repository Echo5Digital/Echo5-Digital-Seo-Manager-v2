<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">SEO Audits</h1>
        <p class="text-gray-600 mt-1">Analyze and improve website SEO performance</p>
      </div>
      <button @click="showRunModal = true" class="btn btn-primary flex items-center gap-2">
        <PlusIcon class="w-5 h-5" />
        Run New Audit
      </button>
    </div>

    <!-- Filter -->
    <div class="card mb-6">
      <div class="flex gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Client</label>
          <select v-model="selectedClient" @change="handleFilterChange" class="input">
            <option value="">All Clients</option>
            <option v-for="client in clients" :key="client._id" :value="client._id">
              {{ client.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Audits List -->
    <div class="card">
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading audits...</p>
      </div>

      <div v-else-if="filteredAudits.length === 0" class="text-center py-12">
        <DocumentMagnifyingGlassIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p class="text-gray-500">No audits found</p>
        <button @click="showRunModal = true" class="btn btn-primary mt-4">
          Run Your First Audit
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="audit in filteredAudits" :key="audit._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ getClientName(audit.clientId) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <a :href="audit.url" target="_blank" class="text-sm text-blue-600 hover:underline">
                  {{ truncateUrl(audit.url) }}
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div :class="getScoreColorClass(audit.score)" class="text-2xl font-bold">
                    {{ audit.score || 'N/A' }}
                  </div>
                  <div v-if="audit.score" class="text-xs text-gray-500">/100</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex gap-2">
                  <span v-if="audit.issues?.critical" class="badge badge-danger">
                    {{ audit.issues.critical }} Critical
                  </span>
                  <span v-if="audit.issues?.warning" class="badge badge-warning">
                    {{ audit.issues.warning }} Warning
                  </span>
                  <span v-if="audit.issues?.info" class="badge badge-info">
                    {{ audit.issues.info }} Info
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(audit.status)">
                  {{ audit.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(audit.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex gap-2">
                  <button @click="viewAudit(audit._id)" class="text-blue-600 hover:text-blue-900">
                    <EyeIcon class="w-5 h-5" />
                  </button>
                  <button @click="handleDeleteAudit(audit._id)" class="text-red-600 hover:text-red-900">
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Run Audit Modal -->
    <Modal :show="showRunModal" @close="showRunModal = false">
      <template #title>Run SEO Audit</template>
      <template #content>
        <form @submit.prevent="handleRunAudit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select v-model="newAudit.clientId" required class="input">
              <option value="">Select Client</option>
              <option v-for="client in clients" :key="client._id" :value="client._id">
                {{ client.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input v-model="newAudit.url" type="url" required class="input" 
                   placeholder="https://example.com" />
            <p class="text-xs text-gray-500 mt-1">Enter the full URL including https://</p>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex gap-2">
              <InformationCircleIcon class="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div class="text-sm text-blue-700">
                <p class="font-semibold mb-1">What we'll analyze:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>Page speed and performance</li>
                  <li>Meta tags and SEO elements</li>
                  <li>Mobile responsiveness</li>
                  <li>Accessibility issues</li>
                  <li>Technical SEO factors</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showRunModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary">
              {{ submitting ? 'Running Audit...' : 'Run Audit' }}
            </button>
          </div>
        </form>
      </template>
    </Modal>

    <!-- Audit Details Modal -->
    <Modal :show="showDetailsModal" @close="showDetailsModal = false">
      <template #title>Audit Details</template>
      <template #content>
        <div v-if="selectedAudit" class="space-y-6">
          <!-- Score Overview -->
          <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <div class="text-center">
              <div :class="getScoreColorClass(selectedAudit.score)" class="text-6xl font-bold mb-2">
                {{ selectedAudit.score || 'N/A' }}
              </div>
              <p class="text-gray-600">Overall SEO Score</p>
            </div>
          </div>

          <!-- Issues Summary -->
          <div v-if="selectedAudit.issues" class="grid grid-cols-3 gap-4">
            <div class="bg-red-50 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold text-red-600">{{ selectedAudit.issues.critical || 0 }}</div>
              <div class="text-sm text-gray-600">Critical Issues</div>
            </div>
            <div class="bg-yellow-50 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold text-yellow-600">{{ selectedAudit.issues.warning || 0 }}</div>
              <div class="text-sm text-gray-600">Warnings</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold text-blue-600">{{ selectedAudit.issues.info || 0 }}</div>
              <div class="text-sm text-gray-600">Info</div>
            </div>
          </div>

          <!-- Recommendations -->
          <div v-if="selectedAudit.recommendations?.length">
            <h4 class="font-semibold text-gray-900 mb-3">Recommendations</h4>
            <div class="space-y-2">
              <div v-for="(rec, index) in selectedAudit.recommendations" :key="index" 
                   class="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <ExclamationTriangleIcon class="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p class="text-sm text-gray-700">{{ rec }}</p>
              </div>
            </div>
          </div>

          <!-- Technical Details -->
          <div v-if="selectedAudit.technicalIssues?.length">
            <h4 class="font-semibold text-gray-900 mb-3">Technical Issues</h4>
            <div class="space-y-2">
              <div v-for="(issue, index) in selectedAudit.technicalIssues" :key="index" 
                   class="p-3 border border-gray-200 rounded-lg">
                <p class="text-sm font-medium text-gray-900">{{ issue.title || issue }}</p>
                <p v-if="issue.description" class="text-xs text-gray-500 mt-1">{{ issue.description }}</p>
              </div>
            </div>
          </div>

          <!-- Meta Information -->
          <div v-if="selectedAudit.metaData" class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-3">Page Information</h4>
            <div class="space-y-2 text-sm">
              <div v-if="selectedAudit.metaData.title">
                <span class="font-medium text-gray-700">Title:</span>
                <span class="text-gray-600 ml-2">{{ selectedAudit.metaData.title }}</span>
              </div>
              <div v-if="selectedAudit.metaData.description">
                <span class="font-medium text-gray-700">Description:</span>
                <span class="text-gray-600 ml-2">{{ selectedAudit.metaData.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { 
  PlusIcon, 
  TrashIcon, 
  EyeIcon,
  DocumentMagnifyingGlassIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import { useAuditStore } from '~/stores/audits'
import { useClientStore } from '~/stores/clients'
import { format } from 'date-fns'

definePageMeta({
  middleware: ['auth'],
})

const auditStore = useAuditStore()
const clientStore = useClientStore()

const loading = ref(true)
const showRunModal = ref(false)
const showDetailsModal = ref(false)
const submitting = ref(false)
const selectedClient = ref('')
const selectedAudit = ref(null)

const newAudit = ref({
  clientId: '',
  url: ''
})

const clients = computed(() => clientStore.clients)
const audits = computed(() => auditStore.audits)

const filteredAudits = computed(() => {
  if (!selectedClient.value) return audits.value
  return audits.value.filter(a => a.clientId === selectedClient.value)
})

const getClientName = (clientId) => {
  const client = clients.value.find(c => c._id === clientId)
  return client?.name || 'Unknown'
}

const truncateUrl = (url) => {
  if (url.length <= 50) return url
  return url.substring(0, 47) + '...'
}

const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

const getScoreColorClass = (score) => {
  if (!score) return 'text-gray-400'
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  if (score >= 50) return 'text-orange-600'
  return 'text-red-600'
}

const getStatusBadgeClass = (status) => {
  const classes = {
    'Completed': 'badge badge-success',
    'In Progress': 'badge badge-warning',
    'Failed': 'badge badge-danger',
    'Pending': 'badge badge-info'
  }
  return classes[status] || 'badge badge-secondary'
}

const handleFilterChange = () => {
  // Filter already handled by computed property
}

const handleRunAudit = async () => {
  submitting.value = true
  try {
    await auditStore.runAudit(newAudit.value.clientId, newAudit.value.url)
    showRunModal.value = false
    newAudit.value = { clientId: '', url: '' }
  } catch (error) {
    console.error('Error running audit:', error)
    alert('Failed to run audit. Please try again.')
  } finally {
    submitting.value = false
  }
}

const viewAudit = async (auditId) => {
  try {
    selectedAudit.value = await auditStore.getAuditDetails(auditId)
    showDetailsModal.value = true
  } catch (error) {
    console.error('Error loading audit details:', error)
    alert('Failed to load audit details')
  }
}

const handleDeleteAudit = async (auditId) => {
  if (!confirm('Are you sure you want to delete this audit?')) return
  
  try {
    await auditStore.deleteAudit(auditId)
  } catch (error) {
    console.error('Error deleting audit:', error)
    alert('Failed to delete audit')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      clientStore.fetchClients(),
      auditStore.fetchAudits()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
})
</script>
