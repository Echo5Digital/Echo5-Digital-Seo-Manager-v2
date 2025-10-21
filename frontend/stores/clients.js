import { defineStore } from 'pinia'

/**
 * Clients Store
 * Manages client data and operations
 */
export const useClientStore = defineStore('clients', {
  state: () => ({
    clients: [],
    currentClient: null,
    loading: false,
    error: null,
  }),

  getters: {
    activeClients: (state) => (state.clients || []).filter(c => c.isActive),
    clientCount: (state) => state.clients.length,
    getClientById: (state) => (id) => (state.clients || []).find(c => c._id === id),
  },

  actions: {
    /**
     * Fetch all clients
     */
    async fetchClients() {
      this.loading = true
      this.error = null
      try {
        const { $api } = useNuxtApp()
        const response = await $api.get('/clients')
        
        if (response.data.status === 'success') {
          this.clients = response.data.data.clients
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch clients'
        console.error('Fetch clients error:', error)
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch single client
     */
    async fetchClient(id) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const response = await $api.get(`/clients/${id}`)
        
        if (response.data.status === 'success') {
          this.currentClient = response.data.data.client
          return this.currentClient
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch client'
        console.error('Fetch client error:', error)
      } finally {
        this.loading = false
      }
    },

    /**
     * Create new client
     */
    async createClient(clientData) {
      try {
        const { $api } = useNuxtApp()
        const response = await $api.post('/clients', clientData)
        
        if (response.data.status === 'success') {
          if (!this.clients) {
            this.clients = []
          }
          this.clients.push(response.data.data.client)
          return { success: true, client: response.data.data.client }
        }
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || 'Failed to create client',
        }
      }
    },

    /**
     * Update client
     */
    async updateClient(id, clientData) {
      try {
        const { $api } = useNuxtApp()
        const response = await $api.put(`/clients/${id}`, clientData)
        
        if (response.data.status === 'success') {
          const index = this.clients.findIndex(c => c._id === id)
          if (index !== -1) {
            this.clients[index] = response.data.data.client
          }
          return { success: true }
        }
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || 'Failed to update client',
        }
      }
    },

    /**
     * Delete client
     */
    async deleteClient(id) {
      try {
        const { $api } = useNuxtApp()
        await $api.delete(`/clients/${id}`)
        
        this.clients = (this.clients || []).filter(c => c._id !== id)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || 'Failed to delete client',
        }
      }
    },
  },
})
