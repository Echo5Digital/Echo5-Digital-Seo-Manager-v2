import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useKeywordStore = defineStore('keywords', {
  state: () => ({
    keywords: [],
    loading: false,
    error: null,
  }),

  getters: {
    keywordsByClient: (state) => (clientId) => {
      return (state.keywords || []).filter(k => k.clientId === clientId)
    },
    totalKeywords: (state) => (state.keywords || []).length,
  },

  actions: {
    async fetchKeywords(clientId = null) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const runtimeConfig = useRuntimeConfig()
        const response = await $fetch(`${runtimeConfig.public.apiBase}/api/keywords`, {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          query: clientId ? { clientId } : {},
        })

        this.keywords = response.data.keywords || []
        return response.data.keywords || []
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async addKeyword(keywordData) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const runtimeConfig = useRuntimeConfig()
        const response = await $fetch(`${runtimeConfig.public.apiBase}/api/keywords`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: keywordData,
        })

        if (!this.keywords) {
          this.keywords = []
        }
        this.keywords.unshift(response.data.keyword)
        return response.data.keyword
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateKeyword(id, updates) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const runtimeConfig = useRuntimeConfig()
        const response = await $fetch(`${runtimeConfig.public.apiBase}/api/keywords/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: updates,
        })

        if (!this.keywords) {
          this.keywords = []
        }
        const index = this.keywords.findIndex(k => k._id === id)
        if (index !== -1) {
          this.keywords[index] = response.data.keyword
        }
        return response.data.keyword
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteKeyword(id) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const runtimeConfig = useRuntimeConfig()
        await $fetch(`${runtimeConfig.public.apiBase}/api/keywords/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        this.keywords = (this.keywords || []).filter(k => k._id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
