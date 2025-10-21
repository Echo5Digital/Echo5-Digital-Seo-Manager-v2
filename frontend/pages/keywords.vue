<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Keywords</h1>
        <p class="text-gray-600 mt-1">Manage and track keyword performance</p>
      </div>
      <button @click="showAddModal = true" class="btn btn-primary">
        <PlusIcon class="w-5 h-5 mr-2" />
        Add Keyword
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex gap-4">
        <select v-model="selectedClient" class="input">
          <option value="">All Clients</option>
          <option v-for="client in clients" :key="client._id" :value="client._id">
            {{ client.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Keywords Table -->
    <div class="card">
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="filteredKeywords.length === 0" class="text-center py-12">
        <MagnifyingGlassIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 class="text-lg font-semibold mb-2">No Keywords Found</h3>
        <p class="text-gray-600 mb-4">Start tracking keywords to monitor your SEO performance.</p>
        <button @click="showAddModal = true" class="btn btn-primary">
          Add First Keyword
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keyword
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Rank
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Search Volume
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="keyword in filteredKeywords" :key="keyword._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">{{ keyword.keyword }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ keyword.clientId?.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getRankBadgeClass(keyword.rankTracking?.currentRank)">
                  {{ keyword.rankTracking?.currentRank || 'N/A' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ keyword.volume?.toLocaleString() || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getDifficultyBadgeClass(keyword.competition)">
                  {{ keyword.competition }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="deleteKeyword(keyword._id)" class="text-red-600 hover:text-red-900">
                  <TrashIcon class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Keyword Modal -->
    <Modal :show="showAddModal" @close="showAddModal = false">
      <template #title>Add New Keyword</template>
      <template #content>
        <form @submit.prevent="handleAddKeyword" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select v-model="newKeyword.clientId" required class="input">
              <option value="">Select Client</option>
              <option v-for="client in clients" :key="client._id" :value="client._id">
                {{ client.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
            <input v-model="newKeyword.keyword" type="text" required class="input" 
                   placeholder="Enter keyword phrase" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search Volume</label>
            <input v-model.number="newKeyword.volume" type="number" class="input" 
                   placeholder="Monthly search volume" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select v-model="newKeyword.competition" class="input">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary">
              {{ submitting ? 'Adding...' : 'Add Keyword' }}
            </button>
          </div>
        </form>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useKeywordStore } from '~/stores/keywords'
import { useClientStore } from '~/stores/clients'

definePageMeta({
  middleware: ['auth'],
})

const keywordStore = useKeywordStore()
const clientStore = useClientStore()

const loading = ref(true)
const showAddModal = ref(false)
const submitting = ref(false)
const selectedClient = ref('')
const clients = computed(() => clientStore.clients || [])
const keywords = computed(() => keywordStore.keywords || [])

const filteredKeywords = computed(() => {
  if (!selectedClient.value) return keywords.value
  return keywords.value.filter(k => k.clientId === selectedClient.value)
})

const newKeyword = ref({
  clientId: '',
  keyword: '',
  volume: 0,
  competition: 'Medium',
})

onMounted(async () => {
  try {
    loading.value = true
    await Promise.all([
      keywordStore.fetchKeywords(),
      clientStore.fetchClients(),
    ])
  } catch (error) {
    console.error('Error loading keywords:', error)
  } finally {
    loading.value = false
  }
})



const handleAddKeyword = async () => {
  try {
    submitting.value = true
    await keywordStore.addKeyword(newKeyword.value)
    showAddModal.value = false
    newKeyword.value = {
      clientId: '',
      keyword: '',
      volume: 0,
      competition: 'Medium',
    }
  } catch (error) {
    console.error('Error adding keyword:', error)
    alert('Failed to add keyword')
  } finally {
    submitting.value = false
  }
}

const deleteKeyword = async (id) => {
  if (!confirm('Are you sure you want to delete this keyword?')) return
  
  try {
    await keywordStore.deleteKeyword(id)
    filterKeywords()
  } catch (error) {
    console.error('Error deleting keyword:', error)
    alert('Failed to delete keyword')
  }
}

const getRankBadgeClass = (rank) => {
  if (!rank) return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800'
  if (rank <= 3) return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800'
  if (rank <= 10) return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800'
  if (rank <= 20) return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800'
  return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800'
}

const getDifficultyBadgeClass = (difficulty) => {
  const classes = {
    'Low': 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800',
    'Medium': 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800',
    'High': 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800',
  }
  return classes[difficulty] || classes['Medium']
}
</script>
