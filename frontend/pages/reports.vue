<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Reports</h1>
        <p class="text-gray-600 mt-1">Generate and view SEO reports</p>
      </div>
      <button @click="showGenerateModal = true" class="btn btn-primary">
        <PlusIcon class="w-5 h-5 mr-2" />
        Generate Report
      </button>
    </div>

    <!-- Client Filter -->
    <div class="card mb-6">
      <select v-model="selectedClient" @change="loadReports" class="input">
        <option value="">Select Client</option>
        <option v-for="client in clients" :key="client._id" :value="client._id">
          {{ client.name }}
        </option>
      </select>
    </div>

    <!-- Reports List -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <div v-else-if="!selectedClient" class="card text-center py-12">
      <DocumentTextIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h3 class="text-lg font-semibold mb-2">Select a Client</h3>
      <p class="text-gray-600">Choose a client to view their SEO reports.</p>
    </div>

    <div v-else-if="reports.length === 0" class="card text-center py-12">
      <DocumentTextIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h3 class="text-lg font-semibold mb-2">No Reports Found</h3>
      <p class="text-gray-600 mb-4">Generate your first SEO report for this client.</p>
      <button @click="showGenerateModal = true" class="btn btn-primary">
        Generate First Report
      </button>
    </div>

    <div v-else class="grid gap-4">
      <div v-for="report in reports" :key="report._id" class="card hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ getReportTitle(report.reportType) }}
              </h3>
              <span :class="getStatusBadgeClass(report.status)">
                {{ report.status }}
              </span>
            </div>
            
            <div class="flex items-center gap-6 text-sm text-gray-500 mb-3">
              <div class="flex items-center gap-1">
                <CalendarIcon class="w-4 h-4" />
                {{ formatDate(report.createdAt) }}
              </div>
              <div class="flex items-center gap-1">
                Period: {{ formatDate(report.startDate) }} - {{ formatDate(report.endDate) }}
              </div>
            </div>

            <div v-if="report.data" class="grid grid-cols-4 gap-4 mt-4">
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">{{ report.data.organicTraffic || 0 }}</div>
                <div class="text-xs text-gray-600">Organic Traffic</div>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{{ report.data.avgPosition || 0 }}</div>
                <div class="text-xs text-gray-600">Avg Position</div>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-orange-600">{{ report.data.clickThroughRate || 0 }}%</div>
                <div class="text-xs text-gray-600">CTR</div>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">{{ report.data.impressions || 0 }}</div>
                <div class="text-xs text-gray-600">Impressions</div>
              </div>
            </div>
          </div>
          
          <div class="flex gap-2 ml-4">
            <button class="btn btn-sm btn-primary">
              <EyeIcon class="w-4 h-4 mr-1" />
              View
            </button>
            <button class="btn btn-sm btn-secondary">
              <ArrowDownTrayIcon class="w-4 h-4 mr-1" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Report Modal -->
    <Modal :show="showGenerateModal" @close="showGenerateModal = false">
      <template #title>Generate New Report</template>
      <template #content>
        <form @submit.prevent="handleGenerateReport" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select v-model="newReport.clientId" required class="input">
              <option value="">Select Client</option>
              <option v-for="client in clients" :key="client._id" :value="client._id">
                {{ client.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select v-model="newReport.reportType" required class="input">
              <option value="SEO Audit">SEO Audit</option>
              <option value="Keyword Performance">Keyword Performance</option>
              <option value="Traffic Analysis">Traffic Analysis</option>
              <option value="Backlink Report">Backlink Report</option>
              <option value="Monthly Summary">Monthly Summary</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input v-model="newReport.startDate" type="date" required class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input v-model="newReport.endDate" type="date" required class="input" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showGenerateModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary">
              {{ submitting ? 'Generating...' : 'Generate Report' }}
            </button>
          </div>
        </form>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { DocumentTextIcon, PlusIcon, EyeIcon, ArrowDownTrayIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import { useReportStore } from '~/stores/reports'
import { useClientStore } from '~/stores/clients'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const reportStore = useReportStore()
const clientStore = useClientStore()
const authStore = useAuthStore()

const loading = ref(false)
const showGenerateModal = ref(false)
const submitting = ref(false)
const selectedClient = ref('')
const clients = ref([])
const reports = ref([])

const newReport = ref({
  clientId: '',
  reportType: 'Monthly Summary',
  startDate: '',
  endDate: '',
})

onMounted(async () => {
  try {
    await clientStore.fetchClients()
    clients.value = clientStore.clients
    
    // Set default dates (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    newReport.value.startDate = startDate.toISOString().split('T')[0]
    newReport.value.endDate = endDate.toISOString().split('T')[0]
  } catch (error) {
    console.error('Error loading clients:', error)
  }
})

const loadReports = async () => {
  if (!selectedClient.value) {
    reports.value = []
    return
  }
  
  try {
    loading.value = true
    reports.value = await reportStore.fetchReports(selectedClient.value)
  } catch (error) {
    console.error('Error loading reports:', error)
  } finally {
    loading.value = false
  }
}

const handleGenerateReport = async () => {
  try {
    submitting.value = true
    await reportStore.generateReport(newReport.value)
    showGenerateModal.value = false
    
    // Reload reports if same client is selected
    if (selectedClient.value === newReport.value.clientId) {
      await loadReports()
    }
  } catch (error) {
    console.error('Error generating report:', error)
    alert('Failed to generate report')
  } finally {
    submitting.value = false
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const getReportTitle = (type) => {
  return type || 'SEO Report'
}

const getStatusBadgeClass = (status) => {
  const classes = {
    'Pending': 'px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800',
    'Generating': 'px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800',
    'Completed': 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800',
    'Failed': 'px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800',
  }
  return classes[status] || classes['Pending']
}
</script>
