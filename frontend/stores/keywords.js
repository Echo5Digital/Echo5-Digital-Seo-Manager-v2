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
      return state.keywords.filter(k => k.clientId === clientId)
    },
    totalKeywords: (state) => state.keywords.length,
  },

  actions: {
    async fetchKeywords(clientId = null) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          params: clientId ? { clientId } : {},
        }

        const response = await $fetch('/api/keywords', {
          baseURL: 'http://localhost:5001',
          ...config,
        })

        this.keywords = response.data.keywords
        return response.data.keywords
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
        const response = await $fetch('/api/keywords', {
          method: 'POST',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: keywordData,
        })

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
        const response = await $fetch(`/api/keywords/${id}`, {
          method: 'PATCH',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: updates,
        })

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
        await $fetch(`/api/keywords/${id}`, {
          method: 'DELETE',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        this.keywords = this.keywords.filter(k => k._id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
