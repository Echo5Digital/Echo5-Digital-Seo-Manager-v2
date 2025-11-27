import { create } from 'zustand'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5001'

const useChatStore = create((set, get) => ({
  // State
  isOpen: false,
  isLoading: false,
  isTyping: false,
  session: null,
  messages: [],
  history: [],
  error: null,
  
  // Settings
  settings: {
    soundEnabled: true,
    voiceEnabled: true,
    showTimestamps: true,
    theme: 'auto'
  },
  
  // Context (current page, client, etc.)
  context: {},
  
  // UI state
  historyOpen: false,
  inputMode: 'text', // 'text' or 'voice'

  // Actions
  setOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  setInputMode: (inputMode) => set({ inputMode }),
  setContext: (context) => set({ context }),
  
  // Initialize chat session
  initSession: async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`${API_BASE}/api/chat/session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        set({
          session: data.data.session,
          messages: data.data.session.messages || [],
          isLoading: false
        })
      } else {
        set({ error: data.message, isLoading: false })
      }
    } catch (error) {
      console.error('Failed to init chat session:', error)
      set({ error: 'Failed to connect to chat', isLoading: false })
    }
  },

  // Send a message
  sendMessage: async (message, inputType = 'text') => {
    const { context, messages } = get()
    const token = localStorage.getItem('token')
    if (!token || !message.trim()) return

    // Optimistically add user message
    const userMessage = {
      role: 'user',
      content: message,
      inputType,
      timestamp: new Date().toISOString()
    }
    
    set({ 
      messages: [...messages, userMessage],
      isTyping: true,
      error: null 
    })

    try {
      const response = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, inputType, context })
      })

      const data = await response.json()

      if (data.status === 'success') {
        // Add assistant message
        set((state) => ({
          messages: [...state.messages, data.data.message],
          isTyping: false,
          session: {
            ...state.session,
            totalTokens: data.data.totalTokens
          }
        }))
        
        // Play sound if enabled
        if (get().settings.soundEnabled) {
          get().playNotificationSound()
        }

        return data.data.message
      } else {
        set({ error: data.message, isTyping: false })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      set({ 
        error: 'Failed to send message', 
        isTyping: false,
        // Remove optimistic message on error
        messages: messages 
      })
    }
  },

  // Send button action
  sendButtonAction: async (action) => {
    return get().sendMessage(action, 'button')
  },

  // Load chat history
  loadHistory: async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`${API_BASE}/api/chat/history?limit=30`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        set({ history: data.data.sessions })
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  },

  // Load specific session
  loadSession: async (sessionId) => {
    const token = localStorage.getItem('token')
    if (!token) return

    set({ isLoading: true })

    try {
      const response = await fetch(`${API_BASE}/api/chat/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        set({
          session: data.data.session,
          messages: data.data.session.messages || [],
          isLoading: false,
          historyOpen: false
        })
      } else {
        set({ error: data.message, isLoading: false })
      }
    } catch (error) {
      console.error('Failed to load session:', error)
      set({ error: 'Failed to load session', isLoading: false })
    }
  },

  // Search chat history
  searchHistory: async (query) => {
    const token = localStorage.getItem('token')
    if (!token || !query || query.length < 2) return null

    try {
      const response = await fetch(`${API_BASE}/api/chat/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        return data.data.results
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
    return null
  },

  // Submit feedback
  submitFeedback: async (messageIndex, feedback) => {
    const { session } = get()
    const token = localStorage.getItem('token')
    if (!token || !session) return

    try {
      await fetch(`${API_BASE}/api/chat/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: session.id,
          messageIndex,
          feedback
        })
      })

      // Update local state
      set((state) => ({
        messages: state.messages.map((msg, idx) => 
          idx === messageIndex ? { ...msg, feedback } : msg
        )
      }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  },

  // Pin/unpin message
  togglePin: async (messageIndex) => {
    const { session, messages } = get()
    const token = localStorage.getItem('token')
    if (!token || !session) return

    const isPinned = !messages[messageIndex]?.isPinned

    try {
      await fetch(`${API_BASE}/api/chat/pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: session.id,
          messageIndex,
          pinned: isPinned
        })
      })

      // Update local state
      set((state) => ({
        messages: state.messages.map((msg, idx) => 
          idx === messageIndex ? { ...msg, isPinned } : msg
        )
      }))
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  },

  // Clear history
  clearHistory: async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch(`${API_BASE}/api/chat/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      set({ history: [] })
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  },

  // Update settings
  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }))
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatSettings', JSON.stringify({
        ...get().settings,
        ...newSettings
      }))
    }
  },

  // Load settings from localStorage
  loadSettings: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatSettings')
      if (saved) {
        try {
          const settings = JSON.parse(saved)
          set({ settings })
        } catch (e) {
          console.error('Failed to parse chat settings')
        }
      }
    }
  },

  // Play notification sound
  playNotificationSound: () => {
    if (typeof window !== 'undefined' && get().settings.soundEnabled) {
      try {
        const audio = new Audio('/sounds/chat-notification.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {})
      } catch (e) {
        // Silently fail if audio not supported
      }
    }
  },

  // Reset chat state
  reset: () => {
    set({
      isOpen: false,
      isLoading: false,
      isTyping: false,
      session: null,
      messages: [],
      history: [],
      error: null,
      historyOpen: false,
      inputMode: 'text'
    })
  }
}))

export default useChatStore
