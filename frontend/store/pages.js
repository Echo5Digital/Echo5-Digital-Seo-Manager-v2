import { create } from 'zustand'
import useAuthStore from './auth'

const usePagesStore = create((set, get) => ({
  pages: [],
  loading: false,
  error: null,

  fetchPages: async (clientId) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const qs = clientId ? `?clientId=${clientId}` : ''
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages${qs}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await resp.json()
      if (data.status === 'success') {
        set({ pages: data.data.pages || [], loading: false })
      } else {
        set({ error: data.message || 'Failed to fetch pages', loading: false })
      }
    } catch (e) {
      set({ error: e.message || 'Failed to fetch pages', loading: false })
    }
  },

  fetchPage: async (pageId) => {
    try {
      const token = useAuthStore.getState().token
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/${pageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await resp.json()
      if (data.status === 'success') {
        const page = data.data.page
        set(state => {
          const exists = state.pages.find(p => p._id === pageId)
          return { pages: exists ? state.pages.map(p => p._id === pageId ? page : p) : [...state.pages, page] }
        })
        return page
      } else {
        throw new Error(data.message || 'Failed to fetch page')
      }
    } catch (e) {
      set({ error: e.message || 'Failed to fetch page' })
      throw e
    }
  },

  updateFocusKeyword: async (pageId, focusKeyword) => {
    try {
      const token = useAuthStore.getState().token
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/${pageId}/focus-keyword`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ focusKeyword })
      })
      const data = await resp.json()
      if (data.status === 'success') {
        set(state => ({
          pages: state.pages.map(p => p._id === pageId ? data.data.page : p)
        }))
        return data.data.page
      } else {
        throw new Error(data.message || 'Failed to update focus keyword')
      }
    } catch (e) {
      set({ error: e.message || 'Failed to update focus keyword' })
      throw e
    }
  },

  refreshContent: async (pageId) => {
    try {
      const token = useAuthStore.getState().token
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/${pageId}/refresh-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await resp.json()
      if (data.status === 'success') {
        const page = data.data.page
        set(state => ({ pages: state.pages.map(p => p._id === pageId ? page : p) }))
        return page
      } else {
        throw new Error(data.message || 'Failed to refresh content')
      }
    } catch (e) {
      set({ error: e.message || 'Failed to refresh content' })
      throw e
    }
  },

  recrawlPage: async (pageId) => {
    try {
      const token = useAuthStore.getState().token
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/${pageId}/recrawl`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await resp.json()
      if (data.status === 'success') {
        const page = data.data.page
        set(state => ({ pages: state.pages.map(p => p._id === pageId ? page : p) }))
        return page
      } else {
        throw new Error(data.message || 'Failed to recrawl page')
      }
    } catch (e) {
      set({ error: e.message || 'Failed to recrawl page' })
      throw e
    }
  },

  checkSEO: async (pageId) => {
    try {
      const token = useAuthStore.getState().token
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/${pageId}/check-seo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await resp.json()
      if (data.status === 'success') {
        const page = data.data.page
        set(state => ({ pages: state.pages.map(p => p._id === pageId ? page : p) }))
        return data.data
      } else {
        throw new Error(data.message || 'Failed to check SEO')
      }
    } catch (e) {
      set({ error: e.message || 'Failed to check SEO' })
      throw e
    }
  }
}))

export default usePagesStore
