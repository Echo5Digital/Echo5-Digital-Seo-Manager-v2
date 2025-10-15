import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useAuditStore = defineStore('audits', {
  state: () => ({
    audits: [],
    loading: false,
    error: null
  }),

  getters: {
    getAuditsByClient: (state) => (clientId) => {
      return state.audits.filter(audit => audit.clientId === clientId)
    },
    
    latestAudits: (state) => {
      return [...state.audits]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
    },

    getAuditById: (state) => (auditId) => {
      return state.audits.find(audit => audit._id === auditId)
    }
  },

  actions: {
    async fetchAudits(clientId = null) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.loading = true
      this.error = null

      try {
        const url = clientId 
          ? `${config.public.apiBase}/api/audits?clientId=${clientId}`
          : `${config.public.apiBase}/api/audits`

        const response = await $fetch(url, {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        })

        this.audits = response.data
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Fetch audits error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async runAudit(clientId, url) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`${config.public.apiBase}/api/audits`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`
          },
          body: {
            clientId,
            url
          }
        })

        this.audits.unshift(response.data)
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Run audit error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async getAuditDetails(auditId) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`${config.public.apiBase}/api/audits/${auditId}`, {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        })

        // Update audit in state if exists
        const index = this.audits.findIndex(a => a._id === auditId)
        if (index !== -1) {
          this.audits[index] = response.data
        } else {
          this.audits.push(response.data)
        }

        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Get audit details error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteAudit(auditId) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.error = null

      try {
        await $fetch(`${config.public.apiBase}/api/audits/${auditId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        })

        this.audits = this.audits.filter(a => a._id !== auditId)
      } catch (error) {
        this.error = error.message
        console.error('Delete audit error:', error)
        throw error
      }
    }
  }
})
