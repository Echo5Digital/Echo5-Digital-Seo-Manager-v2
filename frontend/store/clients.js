import { create } from 'zustand'
import useAuthStore from './auth'

const useClientStore = create((set, get) => ({
  clients: [],
  currentClient: null,
  loading: false,
  error: null,

  // Fetch all clients
  fetchClients: async () => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      console.log('🔄 Fetching clients from API...')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      console.log('📥 Fetched clients:', data)

      if (data.status === 'success') {
        console.log('✅ Setting clients in store:', data.data.clients.length, 'clients')
        set({
          clients: data.data.clients,
          loading: false
        })
      }
    } catch (error) {
      console.error('❌ Error fetching clients:', error)
      set({
        error: error.message || 'Failed to fetch clients',
        loading: false
      })
    }
  },

  // Fetch single client
  fetchClient: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        set({
          currentClient: data.data.client,
          loading: false
        })
        return data.data.client
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch client',
        loading: false
      })
    }
  },

  // Add client
  addClient: async (clientData) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      console.log('📤 Sending client data to API:', clientData)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
      })

      const data = await response.json()
      console.log('📥 API Response:', data)

      if (data.status === 'success') {
        console.log('✅ Adding client to store:', data.data.client)
        set(state => ({
          clients: [...state.clients, data.data.client],
          loading: false
        }))
        console.log('📊 Updated clients count:', get().clients.length)
        return data.data.client
      } else {
        // Handle error response
        console.error('❌ API Error:', data.message)
        set({
          error: data.message || 'Failed to add client',
          loading: false
        })
        throw new Error(data.message || 'Failed to add client')
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to add client'
      console.error('❌ Error in addClient:', errorMessage, error)
      set({
        error: errorMessage,
        loading: false
      })
      throw error
    }
  },

  // Update client
  updateClient: async (id, clientData) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
      })

      const data = await response.json()

      if (data.status === 'success') {
        set(state => ({
          clients: state.clients.map(c => c._id === id ? data.data.client : c),
          loading: false
        }))
        return data.data.client
      }
    } catch (error) {
      set({
        error: error.message || 'Failed to update client',
        loading: false
      })
      throw error
    }
  },

  // Delete client
  deleteClient: async (id) => {
    set({ error: null })
    try {
      const token = useAuthStore.getState().token
      console.log('🗑️ Deleting client:', id)
      
      // Add ?permanent=true to actually delete from database
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}?permanent=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      console.log('✅ Delete response:', data)

      if (data.status === 'success') {
        set(state => ({
          clients: state.clients.filter(c => c._id !== id)
        }))
        console.log('📊 Client removed from store')
      } else {
        throw new Error(data.message || 'Failed to delete client')
      }
    } catch (error) {
      console.error('❌ Error deleting client:', error)
      set({
        error: error.message || 'Failed to delete client'
      })
      throw error
    }
  },

  // Get client by ID
  getClientById: (id) => {
    return get().clients.find(c => c._id === id)
  }
}))

export default useClientStore
