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
        const auditId = data.data.audit._id
        
        // Add audit to list immediately
        set(state => ({
          audits: [data.data.audit, ...state.audits]
        }))

        // Poll for audit progress using new Bull queue endpoint
        let pollCount = 0
        const pollInterval = setInterval(async () => {
          try {
            pollCount++
            const progressResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits/${auditId}/progress`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            const progressData = await progressResponse.json()
            
            if (progressData.status === 'success') {
              const { auditStatus, progress: jobProgress } = progressData.data
              
              // Update audit in list
              const auditResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/audits/${auditId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              const auditData = await auditResponse.json()
              
              if (auditData.status === 'success') {
                set(state => ({
                  audits: state.audits.map(a => a._id === auditId ? auditData.data.audit : a)
                }))
              }

              // Update progress UI based on Bull queue progress
              if (auditStatus === 'Queued' || auditStatus === 'Running') {
                const steps = get().auditProgress.steps
                const currentProgress = jobProgress || 0
                const stepIndex = Math.floor((currentProgress / 100) * steps.length)
                
                set(state => ({
                  auditProgress: {
                    ...state.auditProgress,
                    step: steps[Math.min(stepIndex, steps.length - 1)],
                    progress: currentProgress
                  }
                }))
              } else if (auditStatus === 'Completed') {
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
              } else if (auditStatus === 'Failed') {
                // Audit failed
                clearInterval(pollInterval)
                const auditError = auditData.data.audit.error || 'Audit failed'
                set(state => ({
                  loading: false,
                  error: auditError,
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
            console.error('Error polling audit progress:', error)
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
