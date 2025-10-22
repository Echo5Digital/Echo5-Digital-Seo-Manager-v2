import { create } from 'zustand'
import useAuthStore from './auth'

const useAuditStore = create((set, get) => ({
  audits: [],
  loading: false,
  error: null,
  auditProgress: {
    isRunning: false,
    step: '',
    progress: 0,
    steps: [
      'Initializing audit...',
      'Analyzing page structure...',
      'Checking SEO metadata...',
      'Scanning for technical issues...',
      'Analyzing content quality...',
      'Checking mobile responsiveness...',
      'Measuring page performance...',
      'Generating recommendations...',
      'Finalizing audit report...'
    ]
  },

  // Fetch all audits
  fetchAudits: async () => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        set({
          audits: data.data.audits || [],
          loading: false
        })
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch audits',
        loading: false
      })
    }
  },

  // Run audit
  runAudit: async (clientId, url) => {
    const token = useAuthStore.getState().token
    set({ 
      loading: true, 
      error: null,
      auditProgress: {
        ...get().auditProgress,
        isRunning: true,
        progress: 0
      }
    })

    try {
      // Simulate progress through steps
      const steps = get().auditProgress.steps
      for (let i = 0; i < steps.length; i++) {
        set(state => ({
          auditProgress: {
            ...state.auditProgress,
            step: steps[i],
            progress: ((i + 1) / steps.length) * 100
          }
        }))
        
        // Add delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientId, url })
      })

      const data = await response.json()

      if (data.status === 'success') {
        set(state => ({
          audits: [data.data, ...state.audits],
          loading: false,
          auditProgress: {
            ...state.auditProgress,
            isRunning: false,
            progress: 0,
            step: ''
          }
        }))
        return data.data
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to run audit',
        loading: false,
        auditProgress: {
          ...get().auditProgress,
          isRunning: false,
          progress: 0,
          step: ''
        }
      })
      throw error
    }
  },

  // Get audit details
  getAuditDetails: async (auditId) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits/details/${auditId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        set(state => {
          const index = state.audits.findIndex(a => a._id === auditId)
          const newAudits = [...state.audits]
          if (index !== -1) {
            newAudits[index] = data.data
          } else {
            newAudits.push(data.data)
          }
          return {
            audits: newAudits,
            loading: false
          }
        })
        return data.data
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to get audit details',
        loading: false
      })
      throw error
    }
  },

  // Delete audit
  deleteAudit: async (auditId) => {
    set({ error: null })
    try {
      const token = useAuthStore.getState().token
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits/${auditId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      set(state => ({
        audits: state.audits.filter(a => a._id !== auditId)
      }))
    } catch (error) {
      set({
        error: error.message || 'Failed to delete audit'
      })
      throw error
    }
  },

  // Reset audit progress
  resetAuditProgress: () => {
    set(state => ({
      auditProgress: {
        ...state.auditProgress,
        isRunning: false,
        progress: 0,
        step: ''
      }
    }))
  }
}))

export default useAuditStore
