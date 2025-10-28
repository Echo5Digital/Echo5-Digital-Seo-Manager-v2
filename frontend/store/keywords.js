import { create } from 'zustand'
import useAuthStore from './auth'

const useKeywordStore = create((set, get) => ({
  keywords: [],
  loading: false,
  error: null,

  // Fetch all keywords
  fetchKeywords: async () => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keywords`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        set({
          keywords: data.data.keywords || [],
          loading: false
        })
      } else {
        set({ error: data.message, loading: false })
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch keywords',
        loading: false
      })
    }
  },

  // Add keyword
  addKeyword: async (keywordData) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keywords`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(keywordData)
      })

      const data = await response.json()

      if (data.status === 'success') {
        await get().fetchKeywords()
        set({ loading: false })
        return data.data
      } else {
        set({ error: data.message, loading: false })
        throw new Error(data.message)
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to add keyword',
        loading: false
      })
      throw error
    }
  },

  // Update keyword
  updateKeyword: async (id, keywordData) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keywords/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(keywordData)
      })

      const data = await response.json()

      if (data.status === 'success') {
        await get().fetchKeywords()
        set({ loading: false })
        return data.data
      } else {
        set({ error: data.message, loading: false })
        throw new Error(data.message)
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to update keyword',
        loading: false
      })
      throw error
    }
  },

  // Delete keyword
  deleteKeyword: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keywords/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        await get().fetchKeywords()
        set({ loading: false })
        return true
      } else {
        set({ error: data.message, loading: false })
        throw new Error(data.message)
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to delete keyword',
        loading: false
      })
      throw error
    }
  }
}))

export default useKeywordStore
