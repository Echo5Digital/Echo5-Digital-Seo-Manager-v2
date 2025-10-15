import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    loading: false,
    error: null,
  }),

  getters: {
    pendingTasks: (state) => state.tasks.filter(t => t.status === 'Pending'),
    inProgressTasks: (state) => state.tasks.filter(t => t.status === 'In Progress'),
    completedTasks: (state) => state.tasks.filter(t => t.status === 'Completed'),
    tasksByClient: (state) => (clientId) => {
      return state.tasks.filter(t => t.clientId === clientId)
    },
  },

  actions: {
    async fetchTasks(filters = {}) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch('/api/tasks', {
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          params: filters,
        })

        this.tasks = response.data.tasks
        return response.data.tasks
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async createTask(taskData) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch('/api/tasks', {
          method: 'POST',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: taskData,
        })

        this.tasks.unshift(response.data.task)
        return response.data.task
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateTask(id, updates) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const response = await $fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: updates,
        })

        const index = this.tasks.findIndex(t => t._id === id)
        if (index !== -1) {
          this.tasks[index] = response.data.task
        }
        return response.data.task
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteTask(id) {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        await $fetch(`/api/tasks/${id}`, {
          method: 'DELETE',
          baseURL: 'http://localhost:5001',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        this.tasks = this.tasks.filter(t => t._id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
