import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

/**
 * Pages Store
 * Manages SEO-optimized pages, blogs, and content
 */
export const usePageStore = defineStore('pages', {
  state: () => ({
    pages: [],
    loading: false,
    error: null,
  }),

  getters: {
    // Get pages by client
    getPagesByClient: (state) => (clientId) => {
      return state.pages.filter(p => p.clientId === clientId || p.clientId?._id === clientId)
    },

    // Get pages by type
    getPagesByType: (state) => (type) => {
      return state.pages.filter(p => p.type === type)
    },

    // Get pages by status
    getPagesByStatus: (state) => (status) => {
      return state.pages.filter(p => p.status === status)
    },

    // Get published pages
    publishedPages: (state) => {
      return state.pages.filter(p => p.status === 'Published')
    },

    // Get draft pages
    draftPages: (state) => {
      return state.pages.filter(p => p.status === 'Draft')
    },

    // Get blogs
    blogs: (state) => {
      return state.pages.filter(p => p.type === 'blog')
    },

    // Get pages with issues
    pagesWithIssues: (state) => {
      return state.pages.filter(p => p.issues && p.issues.length > 0)
    },

    // Get total pages count
    totalPages: (state) => state.pages.length,

    // Average SEO score
    averageSEOScore: (state) => {
      if (state.pages.length === 0) return 0
      const scores = state.pages
        .filter(p => p.seo?.seoScore)
        .map(p => p.seo.seoScore)
      if (scores.length === 0) return 0
      return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    },
  },

  actions: {
    /**
     * Fetch all pages
     */
    async fetchPages(filters = {}) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const queryParams = new URLSearchParams()
        if (filters.clientId) queryParams.append('clientId', filters.clientId)
        if (filters.type) queryParams.append('type', filters.type)
        if (filters.status) queryParams.append('status', filters.status)

        const response = await $fetch(`/api/pages?${queryParams.toString()}`, {
          method: 'GET',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        this.pages = response.data.pages
        return response.data.pages
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch single page
     */
    async fetchPage(pageId) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`/api/pages/${pageId}`, {
          method: 'GET',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        return response.data.page
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Add new page
     */
    async addPage(pageData) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch('/api/pages', {
          method: 'POST',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: pageData,
        })

        this.pages.unshift(response.data.page)
        return response.data.page
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Update page
     */
    async updatePage(pageId, updates) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`/api/pages/${pageId}`, {
          method: 'PUT',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: updates,
        })

        const index = this.pages.findIndex(p => p._id === pageId)
        if (index !== -1) {
          this.pages[index] = response.data.page
        }

        return response.data.page
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete page
     */
    async deletePage(pageId) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        await $fetch(`/api/pages/${pageId}`, {
          method: 'DELETE',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        this.pages = this.pages.filter(p => p._id !== pageId)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Analyze page SEO with AI
     */
    async analyzePage(pageId) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`/api/pages/${pageId}/analyze`, {
          method: 'POST',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        const index = this.pages.findIndex(p => p._id === pageId)
        if (index !== -1) {
          this.pages[index] = response.data.page
        }

        return response.data.analysis
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Generate structured data (JSON-LD)
     */
    async generateSchema(pageId, schemaType) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`/api/pages/${pageId}/generate-schema`, {
          method: 'POST',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: { schemaType },
        })

        const index = this.pages.findIndex(p => p._id === pageId)
        if (index !== -1) {
          this.pages[index] = response.data.page
        }

        return response.data.schema
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Check SEO issues
     */
    async checkIssues(pageId) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`/api/pages/${pageId}/check-issues`, {
          method: 'POST',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        const index = this.pages.findIndex(p => p._id === pageId)
        if (index !== -1) {
          this.pages[index] = response.data.page
        }

        return response.data.page.issues
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
