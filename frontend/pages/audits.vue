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
                <a :href="audit.clientId?.domain ? `https://${audit.clientId.domain}` : '#'" target="_blank" class="text-sm text-blue-600 hover:underline">
                  {{ truncateUrl(audit.clientId?.domain) }}
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div :class="getScoreColorClass(audit.summary?.overallScore)" class="text-2xl font-bold">
                    {{ audit.summary?.overallScore || 'N/A' }}
                  </div>
                  <div v-if="audit.summary?.overallScore" class="text-xs text-gray-500">/100</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-wrap gap-1">
                  <span v-if="audit.summary?.criticalCount" class="badge badge-danger">
                    {{ audit.summary.criticalCount }} Critical
                  </span>
                  <span v-if="audit.summary?.highCount" class="badge badge-warning">
                    {{ audit.summary.highCount }} High
                  </span>
                  <span v-if="audit.summary?.mediumCount || audit.summary?.lowCount" class="badge badge-info">
                    {{ (audit.summary.mediumCount || 0) + (audit.summary.lowCount || 0) }} Other
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
              <div :class="getScoreColorClass(selectedAudit.summary?.overallScore)" class="text-6xl font-bold mb-2">
                {{ selectedAudit.summary?.overallScore || 'N/A' }}
              </div>
              <p class="text-gray-600">Overall SEO Score</p>
            </div>
          </div>

          <!-- Issues Summary -->
          <div v-if="selectedAudit.summary" class="grid grid-cols-3 gap-4">
            <div class="bg-red-50 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold text-red-600">{{ selectedAudit.summary.criticalCount || 0 }}</div>
              <div class="text-sm text-gray-600">Critical Issues</div>
            </div>
            <div class="bg-yellow-50 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold text-yellow-600">{{ selectedAudit.summary.highCount || 0 }}</div>
              <div class="text-sm text-gray-600">High Priority</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold text-blue-600">{{ (selectedAudit.summary.mediumCount || 0) + (selectedAudit.summary.lowCount || 0) }}</div>
              <div class="text-sm text-gray-600">Other Issues</div>
            </div>
          </div>

          <!-- AI Analysis -->
          <div v-if="selectedAudit.aiAnalysis?.topPriorities?.length" class="mb-6">
            <h4 class="font-semibold text-gray-900 mb-3">Top Priority Issues</h4>
            <div class="space-y-2">
              <div v-for="(priority, index) in selectedAudit.aiAnalysis.topPriorities" :key="index" 
                   class="flex gap-3 p-3 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p class="text-sm text-red-700">{{ priority }}</p>
              </div>
            </div>
          </div>

          <!-- Quick Wins -->
          <div v-if="selectedAudit.aiAnalysis?.quickWins?.length" class="mb-6">
            <h4 class="font-semibold text-gray-900 mb-3">Quick Wins</h4>
            <div class="space-y-2">
              <div v-for="(win, index) in selectedAudit.aiAnalysis.quickWins" :key="index" 
                   class="flex gap-3 p-3 bg-green-50 rounded-lg">
                <ExclamationTriangleIcon class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p class="text-sm text-green-700">{{ win }}</p>
              </div>
            </div>
          </div>

          <!-- Long Term Actions -->
          <div v-if="selectedAudit.aiAnalysis?.longTermActions?.length" class="mb-6">
            <h4 class="font-semibold text-gray-900 mb-3">Long Term Actions</h4>
            <div class="space-y-2">
              <div v-for="(action, index) in selectedAudit.aiAnalysis.longTermActions" :key="index" 
                   class="p-3 border border-gray-200 rounded-lg">
                <p class="text-sm font-medium text-gray-900">{{ action }}</p>
              </div>
            </div>
          </div>

          <!-- Detailed Issues -->
          <div v-if="selectedAudit.results" class="mb-6">
            <h4 class="font-semibold text-gray-900 mb-4">Detailed Issues</h4>
            
            <!-- Broken Links -->
            <div v-if="selectedAudit.results.brokenLinks?.length" class="mb-4">
              <h5 class="font-medium text-red-600 mb-2">Broken Links ({{ selectedAudit.results.brokenLinks.length }})</h5>
              <div class="space-y-2">
                <div v-for="(link, index) in selectedAudit.results.brokenLinks" :key="index" 
                     class="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div class="text-sm font-medium text-red-800">{{ link.url }}</div>
                  <div class="text-xs text-red-600 mt-1">Status Code: {{ link.statusCode }}</div>
                  <div v-if="link.foundOn?.length" class="text-xs text-red-600 mt-1">
                    Found on: {{ link.foundOn.join(', ') }}
                  </div>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full" 
                        :class="getSeverityClass(link.severity)">{{ link.severity }}</span>
                </div>
              </div>
            </div>

            <!-- Meta Issues -->
            <div v-if="selectedAudit.results.metaIssues?.length" class="mb-4">
              <h5 class="font-medium text-orange-600 mb-2">Meta Issues ({{ selectedAudit.results.metaIssues.length }})</h5>
              <div class="space-y-2">
                <div v-for="(meta, index) in selectedAudit.results.metaIssues" :key="index" 
                     class="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div class="text-sm font-medium text-orange-800">{{ meta.url }}</div>
                  <div class="text-sm text-orange-700 mt-1">{{ meta.type }}: {{ meta.issue }}</div>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full" 
                        :class="getSeverityClass(meta.severity)">{{ meta.severity }}</span>
                </div>
              </div>
            </div>

            <!-- Missing Alt Tags -->
            <div v-if="selectedAudit.results.missingAltTags?.length" class="mb-4">
              <h5 class="font-medium text-yellow-600 mb-2">Missing Alt Tags ({{ selectedAudit.results.missingAltTags.length }})</h5>
              <div class="space-y-2">
                <div v-for="(alt, index) in selectedAudit.results.missingAltTags" :key="index" 
                     class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div class="text-sm font-medium text-yellow-800">{{ alt.imageUrl }}</div>
                  <div class="text-sm text-yellow-700 mt-1">Found on: {{ alt.pageUrl }}</div>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full" 
                        :class="getSeverityClass(alt.severity)">{{ alt.severity }}</span>
                </div>
              </div>
            </div>

            <!-- Page Speed Issues -->
            <div v-if="selectedAudit.results.pageSpeed?.length" class="mb-4">
              <h5 class="font-medium text-blue-600 mb-2">Page Speed Issues ({{ selectedAudit.results.pageSpeed.length }})</h5>
              <div class="space-y-2">
                <div v-for="(speed, index) in selectedAudit.results.pageSpeed" :key="index" 
                     class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div class="text-sm font-medium text-blue-800">{{ speed.url }}</div>
                  <div class="text-sm text-blue-700 mt-1">Load Time: {{ speed.loadTime }}ms</div>
                  <div class="text-sm text-blue-700">Mobile Score: {{ speed.mobileScore }} | Desktop Score: {{ speed.desktopScore }}</div>
                  <div v-if="speed.recommendations?.length" class="text-xs text-blue-600 mt-2">
                    Recommendations: {{ speed.recommendations.join(', ') }}
                  </div>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full" 
                        :class="getSeverityClass(speed.severity)">{{ speed.severity }}</span>
                </div>
              </div>
            </div>

            <!-- Schema Issues -->
            <div v-if="selectedAudit.results.schemaIssues?.length" class="mb-4">
              <h5 class="font-medium text-purple-600 mb-2">Schema Issues ({{ selectedAudit.results.schemaIssues.length }})</h5>
              <div class="space-y-2">
                <div v-for="(schema, index) in selectedAudit.results.schemaIssues" :key="index" 
                     class="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div class="text-sm font-medium text-purple-800">{{ schema.url }}</div>
                  <div class="text-sm text-purple-700 mt-1">{{ schema.type }}: {{ schema.issue }}</div>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full" 
                        :class="getSeverityClass(schema.severity)">{{ schema.severity }}</span>
                </div>
              </div>
            </div>

            <!-- Mobile Issues -->
            <div v-if="selectedAudit.results.mobileIssues?.length" class="mb-4">
              <h5 class="font-medium text-indigo-600 mb-2">Mobile Issues ({{ selectedAudit.results.mobileIssues.length }})</h5>
              <div class="space-y-2">
                <div v-for="(mobile, index) in selectedAudit.results.mobileIssues" :key="index" 
                     class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div class="text-sm font-medium text-indigo-800">{{ mobile.url }}</div>
                  <div class="text-sm text-indigo-700 mt-1">{{ mobile.issue }}</div>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full" 
                        :class="getSeverityClass(mobile.severity)">{{ mobile.severity }}</span>
                </div>
              </div>
            </div>

            <!-- SSL Issues -->
            <div v-if="selectedAudit.results.sslIssues?.length" class="mb-4">
              <h5 class="font-medium text-red-600 mb-2">SSL Issues ({{ selectedAudit.results.sslIssues.length }})</h5>
              <div class="space-y-2">
                <div v-for="(ssl, index) in selectedAudit.results.sslIssues" :key="index" 
                     class="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div class="text-sm font-medium text-red-800">{{ ssl.url }}</div>
                  <div class="text-sm text-red-700 mt-1">{{ ssl.issue }}</div>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full" 
                        :class="getSeverityClass(ssl.severity)">{{ ssl.severity }}</span>
                </div>
              </div>
            </div>

            <!-- No Issues Message -->
            <div v-if="!hasAnyIssues(selectedAudit.results)" class="text-center py-8">
              <div class="text-green-600 mb-2">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-green-800">No Detailed Issues Found</h3>
              <p class="text-sm text-green-600 mt-1">The audit analysis is still being processed or no specific issues were detected.</p>
            </div>
          </div>

          <!-- Executive Summary -->
          <div v-if="selectedAudit.aiAnalysis?.executiveSummary" class="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 class="font-semibold text-gray-900 mb-3">Executive Summary</h4>
            <p class="text-sm text-gray-700">{{ selectedAudit.aiAnalysis.executiveSummary }}</p>
          </div>

          <!-- Raw Audit Data -->
          <div class="border rounded-lg p-4">
            <button @click="showRawData = !showRawData" 
                    class="flex items-center justify-between w-full text-left">
              <h4 class="font-semibold text-gray-900">Complete Audit Data</h4>
              <svg class="w-5 h-5 transform transition-transform" 
                   :class="{ 'rotate-180': showRawData }"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            <div v-if="showRawData" class="mt-4">
              <!-- Audit Metadata -->
              <div class="mb-6 bg-blue-50 rounded-lg p-4">
                <h5 class="font-medium text-blue-800 mb-3">Audit Information</h5>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div><span class="font-medium">ID:</span> {{ selectedAudit._id }}</div>
                  <div><span class="font-medium">Type:</span> {{ selectedAudit.auditType }}</div>
                  <div><span class="font-medium">Status:</span> {{ selectedAudit.status }}</div>
                  <div><span class="font-medium">Created:</span> {{ formatDate(selectedAudit.createdAt) }}</div>
                  <div v-if="selectedAudit.completedAt"><span class="font-medium">Completed:</span> {{ formatDate(selectedAudit.completedAt) }}</div>
                  <div v-if="selectedAudit.nextScheduledAudit"><span class="font-medium">Next Scheduled:</span> {{ formatDate(selectedAudit.nextScheduledAudit) }}</div>
                </div>
              </div>

              <!-- Complete Results Data -->
              <div v-if="selectedAudit.results" class="mb-6">
                <h5 class="font-medium text-gray-800 mb-3">Complete Results Data</h5>
                <pre class="bg-gray-100 rounded p-4 text-xs overflow-auto max-h-96 text-gray-800">{{ JSON.stringify(selectedAudit.results, null, 2) }}</pre>
              </div>

              <!-- Complete Summary Data -->
              <div v-if="selectedAudit.summary" class="mb-6">
                <h5 class="font-medium text-gray-800 mb-3">Complete Summary Data</h5>
                <pre class="bg-gray-100 rounded p-4 text-xs overflow-auto max-h-64 text-gray-800">{{ JSON.stringify(selectedAudit.summary, null, 2) }}</pre>
              </div>

              <!-- Complete AI Analysis Data -->
              <div v-if="selectedAudit.aiAnalysis" class="mb-6">
                <h5 class="font-medium text-gray-800 mb-3">Complete AI Analysis Data</h5>
                <pre class="bg-gray-100 rounded p-4 text-xs overflow-auto max-h-64 text-gray-800">{{ JSON.stringify(selectedAudit.aiAnalysis, null, 2) }}</pre>
              </div>

              <!-- Complete Audit Object -->
              <div class="mb-4">
                <h5 class="font-medium text-gray-800 mb-3">Complete Audit Object (Raw JSON)</h5>
                <div class="flex gap-2 mb-2">
                  <button @click="copyToClipboard(selectedAudit)" 
                          class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                    Copy to Clipboard
                  </button>
                  <button @click="downloadAuditData(selectedAudit)" 
                          class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    Download JSON
                  </button>
                </div>
                <pre class="bg-gray-900 text-green-400 rounded p-4 text-xs overflow-auto max-h-96">{{ JSON.stringify(selectedAudit, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Audit Progress Bar -->
    <AuditProgressBar />
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
const showRawData = ref(false)
const submitting = ref(false)
const selectedClient = ref('')
const selectedAudit = ref(null)

const newAudit = ref({
  clientId: '',
  url: ''
})

// Watch for client selection changes to auto-populate URL
watch(() => newAudit.value.clientId, (newClientId) => {
  if (newClientId) {
    const selectedClient = clients.value.find(c => c._id === newClientId)
    if (selectedClient && selectedClient.domain) {
      newAudit.value.url = selectedClient.domain
    }
  } else {
    newAudit.value.url = ''
  }
})

const clients = computed(() => clientStore.clients || [])
const audits = computed(() => auditStore.audits || [])

const filteredAudits = computed(() => {
  if (!selectedClient.value) return audits.value
  return audits.value.filter(a => a.clientId === selectedClient.value)
})

const getClientName = (clientData) => {
  if (!clientData) return 'Unknown'
  // If clientData is a populated object with name
  if (typeof clientData === 'object' && clientData.name) {
    return clientData.name
  }
  // If clientData is just an ID string, try to find in clients
  if (typeof clientData === 'string') {
    const client = clients.value.find(c => c._id === clientData)
    return client?.name || 'Unknown'
  }
  return 'Unknown'
}

const truncateUrl = (url) => {
  if (!url || typeof url !== 'string') return 'N/A'
  if (url.length <= 50) return url
  return url.substring(0, 47) + '...'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    return format(dateObj, 'MMM dd, yyyy HH:mm')
  } catch (error) {
    return 'Invalid Date'
  }
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

const getSeverityClass = (severity) => {
  const classes = {
    'Critical': 'bg-red-500 text-white',
    'High': 'bg-orange-500 text-white',
    'Medium': 'bg-yellow-500 text-black',
    'Low': 'bg-green-500 text-white'
  }
  return classes[severity] || 'bg-gray-500 text-white'
}

const hasAnyIssues = (results) => {
  if (!results) return false
  const issueTypes = [
    'brokenLinks', 'metaIssues', 'missingAltTags', 'pageSpeed', 
    'schemaIssues', 'mobileIssues', 'sslIssues', 'noindexPages',
    'internalLinkingIssues', 'sitemapIssues', 'robotsTxtIssues'
  ]
  return issueTypes.some(type => results[type]?.length > 0)
}

const copyToClipboard = async (data) => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    alert('Audit data copied to clipboard!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    alert('Failed to copy to clipboard')
  }
}

const downloadAuditData = (audit) => {
  try {
    const dataStr = JSON.stringify(audit, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-${audit._id}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download audit data:', error)
    alert('Failed to download audit data')
  }
}

const handleFilterChange = () => {
  // Filter already handled by computed property
}

const handleRunAudit = async () => {
  submitting.value = true
  try {
    showRunModal.value = false // Close modal immediately to show progress
    await auditStore.runAudit(newAudit.value.clientId, newAudit.value.url)
    newAudit.value = { clientId: '', url: '' }
    // Refresh audits list after completion
    await auditStore.fetchAudits()
  } catch (error) {
    console.error('Error running audit:', error)
    alert('Failed to run audit. Please try again.')
  } finally {
    submitting.value = false
  }
}

const viewAudit = async (auditId) => {
  // Open audit details in new tab
  const url = `/audits/${auditId}`
  window.open(url, '_blank')
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
