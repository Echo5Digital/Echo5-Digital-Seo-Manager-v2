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
      'Discovering pages...',
      'Analyzing page structure...',
      'Checking SEO metadata...',
      'Scanning for technical issues...',
      'Analyzing content quality...',
      'Checking mobile responsiveness...',
      'Measuring page performance...',
      'Generating AI recommendations...',
      'Finalizing audit report...'
    ]
  },

  // Fetch all audits
  fetchAudits: async () => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      console.log('🔄 Fetching audits from API...')
      
      // Add timeout to fetch
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      console.log('📥 Audits response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📥 Audits data:', data)

      if (data.status === 'success') {
        console.log('✅ Setting audits in store:', data.data.audits?.length || 0, 'audits')
        set({
          audits: data.data.audits || [],
          loading: false
        })
      } else {
        console.error('❌ API returned error:', data.message)
        set({
          error: data.message || 'Failed to fetch audits',
          loading: false,
          audits: []
        })
        throw new Error(data.message || 'Failed to fetch audits')
      }
    } catch (error) {
      console.error('❌ Error fetching audits:', error)
      
      let errorMessage = 'Failed to fetch audits'
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - the server took too long to respond'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      set({
        error: errorMessage,
        loading: false,
        audits: []
      })
      throw error
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
        progress: 10,
        step: 'Starting audit...'
      }
    })

    try {
      // Start the audit on backend
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
        const auditId = data.data._id
        
        // Add audit to list immediately
        set(state => ({
          audits: [data.data, ...state.audits]
        }))

        // Poll for audit status
        let pollCount = 0
        const pollInterval = setInterval(async () => {
          try {
            pollCount++
            const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits/${auditId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            const statusData = await statusResponse.json()
            
            if (statusData.status === 'success') {
              const audit = statusData.data.audit
              
              console.log('🔄 Polling received audit:', {
                id: audit._id,
                status: audit.status,
                hasSummary: !!audit.summary,
                summary: audit.summary
              })
              
              // Update audit in list
              set(state => ({
                audits: state.audits.map(a => a._id === auditId ? audit : a)
              }))

              // Update progress based on status
              if (audit.status === 'In Progress') {
                const steps = get().auditProgress.steps
                // Progress through steps based on poll count
                const stepIndex = Math.min(Math.floor(pollCount / 2), steps.length - 2)
                const baseProgress = (stepIndex / (steps.length - 1)) * 90
                const randomProgress = Math.random() * 10
                
                set(state => ({
                  auditProgress: {
                    ...state.auditProgress,
                    step: steps[stepIndex],
                    progress: Math.min(baseProgress + randomProgress, 95)
                  }
                }))
              } else if (audit.status === 'Completed') {
                // Audit completed
                clearInterval(pollInterval)
                set(state => ({
                  loading: false,
                  auditProgress: {
                    ...state.auditProgress,
                    isRunning: false,
                    progress: 100,
                    step: 'Audit completed successfully!'
                  }
                }))
                
                // Reset progress after 2 seconds
                setTimeout(() => {
                  set(state => ({
                    auditProgress: {
                      ...state.auditProgress,
                      progress: 0,
                      step: ''
                    }
                  }))
                }, 2000)
              } else if (audit.status === 'Failed') {
                // Audit failed
                clearInterval(pollInterval)
                set(state => ({
                  loading: false,
                  error: audit.error || 'Audit failed',
                  auditProgress: {
                    ...state.auditProgress,
                    isRunning: false,
                    progress: 0,
                    step: 'Audit failed - please try again'
                  }
                }))
                
                // Reset after 3 seconds
                setTimeout(() => {
                  set(state => ({
                    auditProgress: {
                      ...state.auditProgress,
                      step: ''
                    },
                    error: null
                  }))
                }, 3000)
              }
            }
          } catch (error) {
            console.error('Error polling audit status:', error)
          }
        }, 3000) // Poll every 3 seconds

        // Stop polling after 10 minutes (safety timeout)
        setTimeout(() => {
          clearInterval(pollInterval)
          set(state => ({
            loading: false,
            auditProgress: {
              ...state.auditProgress,
              isRunning: false
            }
          }))
        }, 600000)

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
