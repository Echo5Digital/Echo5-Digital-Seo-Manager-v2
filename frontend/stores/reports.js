import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useReportStore = defineStore('reports', {
  state: () => ({
    reports: [],
    loading: false,
    error: null,
  }),

  getters: {
    reportsByClient: (state) => (clientId) => {
      return state.reports.filter(r => r.clientId === clientId)
    },
  },

  actions: {
    async fetchReports(clientId) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`/api/reports/${clientId}`, {
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        this.reports = response.data.reports
        return response.data.reports
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async generateReport(reportData) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch('/api/reports/generate', {
          method: 'POST',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: reportData,
        })

        this.reports.unshift(response.data.report)
        return response.data.report
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
