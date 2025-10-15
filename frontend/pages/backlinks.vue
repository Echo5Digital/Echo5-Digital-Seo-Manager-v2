<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Backlink Management</h1>
        <p class="text-gray-600 mt-1">Track and manage backlinks for your clients</p>
      </div>
      <button @click="showAddModal = true" class="btn btn-primary flex items-center gap-2">
        <PlusIcon class="w-5 h-5" />
        Add Backlink
      </button>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Backlinks</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ backlinkStore.totalBacklinks }}</p>
          </div>
          <LinkIcon class="w-12 h-12 text-blue-500" />
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Dofollow</p>
            <p class="text-2xl font-bold text-green-600 mt-1">{{ backlinkStore.dofollowCount }}</p>
          </div>
          <CheckCircleIcon class="w-12 h-12 text-green-500" />
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Nofollow</p>
            <p class="text-2xl font-bold text-gray-600 mt-1">{{ backlinkStore.nofollowCount }}</p>
          </div>
          <XCircleIcon class="w-12 h-12 text-gray-400" />
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Avg. DA</p>
            <p class="text-2xl font-bold text-purple-600 mt-1">{{ backlinkStore.averageDomainAuthority }}</p>
          </div>
          <ChartBarIcon class="w-12 h-12 text-purple-500" />
        </div>
      </div>
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
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
          <select v-model="selectedType" class="input">
            <option value="">All Types</option>
            <option value="dofollow">Dofollow Only</option>
            <option value="nofollow">Nofollow Only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Backlinks List -->
    <div class="card">
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading backlinks...</p>
      </div>

      <div v-else-if="filteredBacklinks.length === 0" class="text-center py-12">
        <LinkIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p class="text-gray-500">No backlinks found</p>
        <button @click="showAddModal = true" class="btn btn-primary mt-4">
          Add Your First Backlink
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source URL</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target URL</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anchor Text</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DA</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="backlink in filteredBacklinks" :key="backlink._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ getClientName(backlink.clientId) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <a :href="backlink.sourceUrl" target="_blank" class="text-sm text-blue-600 hover:underline">
                  {{ truncateUrl(backlink.sourceUrl) }}
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <a :href="backlink.targetUrl" target="_blank" class="text-sm text-blue-600 hover:underline">
                  {{ truncateUrl(backlink.targetUrl) }}
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ backlink.anchorText || 'N/A' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div :class="getDaColorClass(backlink.domainAuthority)" class="text-sm font-semibold">
                  {{ backlink.domainAuthority || 'N/A' }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="backlink.dofollow ? 'badge badge-success' : 'badge badge-secondary'">
                  {{ backlink.dofollow ? 'Dofollow' : 'Nofollow' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(backlink.status)">
                  {{ backlink.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(backlink.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="handleDeleteBacklink(backlink._id)" class="text-red-600 hover:text-red-900">
                  <TrashIcon class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Backlink Modal -->
    <Modal :show="showAddModal" @close="showAddModal = false">
      <template #title>Add Backlink</template>
      <template #content>
        <form @submit.prevent="handleAddBacklink" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select v-model="newBacklink.clientId" required class="input">
              <option value="">Select Client</option>
              <option v-for="client in clients" :key="client._id" :value="client._id">
                {{ client.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
            <input v-model="newBacklink.sourceUrl" type="url" required class="input" 
                   placeholder="https://source-website.com/page" />
            <p class="text-xs text-gray-500 mt-1">The page where the backlink is located</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
            <input v-model="newBacklink.targetUrl" type="url" required class="input" 
                   placeholder="https://your-client-site.com/page" />
            <p class="text-xs text-gray-500 mt-1">The page the backlink points to</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Anchor Text</label>
            <input v-model="newBacklink.anchorText" type="text" class="input" 
                   placeholder="Click here to learn more" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Domain Authority</label>
              <input v-model.number="newBacklink.domainAuthority" type="number" min="0" max="100" 
                     class="input" placeholder="0-100" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select v-model="newBacklink.dofollow" class="input">
                <option :value="true">Dofollow</option>
                <option :value="false">Nofollow</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select v-model="newBacklink.status" class="input">
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea v-model="newBacklink.notes" rows="2" class="input" 
                      placeholder="Additional notes about this backlink"></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary">
              {{ submitting ? 'Adding...' : 'Add Backlink' }}
            </button>
          </div>
        </form>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { 
  PlusIcon, 
  TrashIcon, 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline'
import { useBacklinkStore } from '~/stores/backlinks'
import { useClientStore } from '~/stores/clients'
import { format } from 'date-fns'

definePageMeta({
  middleware: ['auth'],
})

const backlinkStore = useBacklinkStore()
const clientStore = useClientStore()

const loading = ref(true)
const showAddModal = ref(false)
const submitting = ref(false)
const selectedClient = ref('')
const selectedType = ref('')

const newBacklink = ref({
  clientId: '',
  sourceUrl: '',
  targetUrl: '',
  anchorText: '',
  domainAuthority: null,
  dofollow: true,
  status: 'Active',
  notes: ''
})

const clients = computed(() => clientStore.clients)
const backlinks = computed(() => backlinkStore.backlinks)

const filteredBacklinks = computed(() => {
  let filtered = backlinks.value

  if (selectedClient.value) {
    filtered = filtered.filter(b => b.clientId === selectedClient.value)
  }

  if (selectedType.value === 'dofollow') {
    filtered = filtered.filter(b => b.dofollow)
  } else if (selectedType.value === 'nofollow') {
    filtered = filtered.filter(b => !b.dofollow)
  }

  return filtered
})

const getClientName = (clientId) => {
  const client = clients.value.find(c => c._id === clientId)
  return client?.name || 'Unknown'
}

const truncateUrl = (url) => {
  if (!url) return 'N/A'
  if (url.length <= 40) return url
  return url.substring(0, 37) + '...'
}

const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy')
}

const getDaColorClass = (da) => {
  if (!da) return 'text-gray-400'
  if (da >= 70) return 'text-green-600'
  if (da >= 40) return 'text-blue-600'
  if (da >= 20) return 'text-yellow-600'
  return 'text-red-600'
}

const getStatusBadgeClass = (status) => {
  const classes = {
    'Active': 'badge badge-success',
    'Pending': 'badge badge-warning',
    'Lost': 'badge badge-danger'
  }
  return classes[status] || 'badge badge-secondary'
}

const handleFilterChange = () => {
  // Filter already handled by computed property
}

const handleAddBacklink = async () => {
  submitting.value = true
  try {
    await backlinkStore.addBacklink(newBacklink.value)
    showAddModal.value = false
    newBacklink.value = {
      clientId: '',
      sourceUrl: '',
      targetUrl: '',
      anchorText: '',
      domainAuthority: null,
      dofollow: true,
      status: 'Active',
      notes: ''
    }
  } catch (error) {
    console.error('Error adding backlink:', error)
    alert('Failed to add backlink. Please try again.')
  } finally {
    submitting.value = false
  }
}

const handleDeleteBacklink = async (backlinkId) => {
  if (!confirm('Are you sure you want to delete this backlink?')) return
  
  try {
    await backlinkStore.deleteBacklink(backlinkId)
  } catch (error) {
    console.error('Error deleting backlink:', error)
    alert('Failed to delete backlink')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      clientStore.fetchClients(),
      backlinkStore.fetchBacklinks()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
})
</script>
