import { create } from 'zustand'

const useTasksStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  // Fetch tasks
  fetchTasks: async (token, filters = {}) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (filters.clientId) queryParams.append('clientId', filters.clientId)
      if (filters.status) queryParams.append('status', filters.status)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/tasks?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()

      if (data.status === 'success') {
        set({ tasks: data.data.tasks, loading: false })
        return data.data.tasks
      } else {
        throw new Error(data.message || 'Failed to fetch tasks')
      }
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Create task
  createTask: async (token, taskData) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/tasks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        }
      )
      const data = await response.json()

      if (data.status === 'success') {
        set((state) => ({ 
          tasks: [data.data.task, ...state.tasks],
          loading: false 
        }))
        return data.data.task
      } else {
        throw new Error(data.message || 'Failed to create task')
      }
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Update task
  updateTask: async (token, taskId, updates) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/tasks/${taskId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      )
      const data = await response.json()

      if (data.status === 'success') {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task._id === taskId ? data.data.task : task
          ),
          loading: false,
        }))
        return data.data.task
      } else {
        throw new Error(data.message || 'Failed to update task')
      }
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default useTasksStore
