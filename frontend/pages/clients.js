import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import useClientStore from '../store/clients'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

export default function Clients() {
  const router = useRouter()
  const clients = useClientStore(state => state.clients)
  const fetchClients = useClientStore(state => state.fetchClients)
  const addClient = useClientStore(state => state.addClient)
  const updateClient = useClientStore(state => state.updateClient)
  const deleteClient = useClientStore(state => state.deleteClient)

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    cms: 'WordPress',
    industry: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchClients()
      } catch (error) {
        console.error('Error loading clients:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fetchClients])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingClient) {
        await updateClient(editingClient._id, formData)
      } else {
        await addClient(formData)
      }
      setShowModal(false)
      setFormData({ name: '', domain: '', cms: 'WordPress', industry: '' })
      setEditingClient(null)
    } catch (error) {
      alert('Failed to save client')
    }
  }

  const handleEdit = (client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      domain: client.domain,
      cms: client.cms,
      industry: client.industry || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this client?')) return
    try {
      await deleteClient(id)
    } catch (error) {
      alert('Failed to delete client')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your client portfolio</p>
          </div>
          <button
            onClick={() => {
              setEditingClient(null)
              setFormData({ name: '', domain: '', cms: 'WordPress', industry: '' })
              setShowModal(true)
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Client
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div key={client._id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                  <a
                    href={`https://${client.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {client.domain}
                  </a>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(client._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">CMS:</span>
                  <span className="font-medium">{client.cms}</span>
                </div>
                {client.industry && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Industry:</span>
                    <span className="font-medium">{client.industry}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`badge ${client.isActive ? 'badge-success' : 'badge-secondary'}`}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/clients/${client._id}`)}
                className="mt-4 w-full btn btn-secondary text-sm"
              >
                View Details
              </button>
            </div>
          ))}

          {clients.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              No clients yet. Add your first client!
            </div>
          )}
        </div>

        <Modal
          show={showModal}
          onClose={() => setShowModal(false)}
          title={editingClient ? 'Edit Client' : 'Add New Client'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="input"
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain *
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                required
                className="input"
                placeholder="example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CMS
              </label>
              <select
                value={formData.cms}
                onChange={(e) => setFormData({ ...formData, cms: e.target.value })}
                className="input"
              >
                <option value="WordPress">WordPress</option>
                <option value="Shopify">Shopify</option>
                <option value="Wix">Wix</option>
                <option value="Webflow">Webflow</option>
                <option value="Custom">Custom</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="input"
                placeholder="E-commerce, Real Estate, etc."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingClient ? 'Update Client' : 'Add Client'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
