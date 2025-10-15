import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useBacklinkStore = defineStore('backlinks', {
  state: () => ({
    backlinks: [],
    loading: false,
    error: null
  }),

  getters: {
    getBacklinksByClient: (state) => (clientId) => {
      return state.backlinks.filter(backlink => backlink.clientId === clientId)
    },

    totalBacklinks: (state) => state.backlinks.length,

    dofollowCount: (state) => {
      return state.backlinks.filter(b => b.dofollow).length
    },

    nofollowCount: (state) => {
      return state.backlinks.filter(b => !b.dofollow).length
    },

    averageDomainAuthority: (state) => {
      if (state.backlinks.length === 0) return 0
      const sum = state.backlinks.reduce((acc, b) => acc + (b.domainAuthority || 0), 0)
      return (sum / state.backlinks.length).toFixed(1)
    }
  },

  actions: {
    async fetchBacklinks(clientId = null) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.loading = true
      this.error = null

      try {
        const url = clientId 
          ? `${config.public.apiBase}/api/backlinks?clientId=${clientId}`
          : `${config.public.apiBase}/api/backlinks`

        const response = await $fetch(url, {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        })

        this.backlinks = response.data
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Fetch backlinks error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async addBacklink(backlinkData) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`${config.public.apiBase}/api/backlinks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`
          },
          body: backlinkData
        })

        this.backlinks.unshift(response.data)
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Add backlink error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateBacklink(backlinkId, updates) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.error = null

      try {
        const response = await $fetch(`${config.public.apiBase}/api/backlinks/${backlinkId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authStore.token}`
          },
          body: updates
        })

        const index = this.backlinks.findIndex(b => b._id === backlinkId)
        if (index !== -1) {
          this.backlinks[index] = response.data
        }

        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Update backlink error:', error)
        throw error
      }
    },

    async deleteBacklink(backlinkId) {
      const authStore = useAuthStore()
      const config = useRuntimeConfig()
      this.error = null

      try {
        await $fetch(`${config.public.apiBase}/api/backlinks/${backlinkId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        })

        this.backlinks = this.backlinks.filter(b => b._id !== backlinkId)
      } catch (error) {
        this.error = error.message
        console.error('Delete backlink error:', error)
        throw error
      }
    }
  }
})
