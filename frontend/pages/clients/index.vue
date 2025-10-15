<template>
  <div>
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Clients</h1>
        <p class="text-gray-600 mt-1">Manage your SEO clients</p>
      </div>
      
      <button
        v-if="authStore.isBoss"
        @click="showAddModal = true"
        class="btn btn-primary"
      >
        + Add Client
      </button>
    </div>

    <!-- Clients Grid -->
    <div v-if="!clientStore.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ClientCard
        v-for="client in clientStore.clients"
        :key="client._id"
        :client="client"
        @click="navigateTo(`/clients/${client._id}`)"
      />
    </div>

    <!-- Loading State -->
    <div v-else class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <!-- Empty State -->
    <div v-if="!clientStore.loading && clientStore.clients.length === 0" class="text-center py-12">
      <p class="text-gray-500">No clients found</p>
    </div>

    <!-- Add Client Modal -->
    <Modal v-if="showAddModal" @close="showAddModal = false">
      <AddClientForm @success="handleClientAdded" @cancel="showAddModal = false" />
    </Modal>
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

const showAddModal = ref(false)

// Fetch clients on mount
onMounted(() => {
  clientStore.fetchClients()
})

const handleClientAdded = () => {
  showAddModal.value = false
  clientStore.fetchClients()
}
</script>
