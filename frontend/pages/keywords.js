import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

export default function Keywords() {
  const [keywords, setKeywords] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingKeyword, setEditingKeyword] = useState(null)
  const [selectedClient, setSelectedClient] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    clientId: '',
    keyword: '',
    keywordType: 'Primary',
    volume: '',
    competition: 'Medium',
    cpc: '',
    intent: 'Informational',
    tags: [],
    targetUrl: ''
  })

  useEffect(() => {
    fetchClients()
    fetchKeywords()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/clients`, {
        credentials: 'include'
      })
      const data = await res.json()
      if (data.status === 'success') {
        setClients(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const fetchKeywords = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keywords`, {
        credentials: 'include'
      })
      const data = await res.json()
      if (data.status === 'success') {
        setKeywords(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingKeyword
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/keywords/${editingKeyword._id}`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/keywords`
      
      const method = editingKeyword ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
      if (data.status === 'success') {
        fetchKeywords()
        handleCloseModal()
      } else {
        alert(data.message || 'Failed to save keyword')
      }
    } catch (error) {
      console.error('Failed to save keyword:', error)
      alert('Failed to save keyword')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keywords/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      const data = await res.json()
      
      if (data.status === 'success') {
        fetchKeywords()
      } else {
        alert(data.message || 'Failed to delete keyword')
      }
    } catch (error) {
      console.error('Failed to delete keyword:', error)
      alert('Failed to delete keyword')
    }
  }

  const handleEdit = (keyword) => {
    setEditingKeyword(keyword)
    setFormData({
      clientId: keyword.clientId?._id || keyword.clientId,
      keyword: keyword.keyword,
      keywordType: keyword.keywordType || 'Primary',
      volume: keyword.volume || '',
      competition: keyword.competition || 'Medium',
      cpc: keyword.cpc || '',
      intent: keyword.intent || 'Informational',
      tags: keyword.tags || [],
      targetUrl: keyword.targetUrl || ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingKeyword(null)
    setFormData({
      clientId: '',
      keyword: '',
      keywordType: 'Primary',
      volume: '',
      competition: 'Medium',
      cpc: '',
      intent: 'Informational',
      tags: [],
      targetUrl: ''
    })
  }

  const filteredKeywords = keywords.filter(kw => {
    const matchesClient = !selectedClient || kw.clientId?._id === selectedClient
    const matchesType = filterType === 'All' || kw.keywordType === filterType
    const matchesSearch = !searchTerm || kw.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesClient && matchesType && matchesSearch
  })

  const getTypeColor = (type) => {
    return type === 'Primary' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  const getCompetitionColor = (comp) => {
    switch(comp) {
      case 'Low': return 'text-green-600'
      case 'Medium': return 'text-yellow-600'
      case 'High': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Keywords</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Keyword
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="All">All Types</option>
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Keywords
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Keywords List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading keywords...</div>
          ) : filteredKeywords.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {keywords.length === 0 ? 'No keywords yet. Add your first keyword!' : 'No keywords match your filters.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredKeywords.map((keyword) => (
                  <tr key={keyword._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{keyword.keyword}</div>
                      {keyword.targetUrl && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{keyword.targetUrl}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(keyword.keywordType)}`}>
                        {keyword.keywordType || 'Primary'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {keyword.clientId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {keyword.volume ? keyword.volume.toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getCompetitionColor(keyword.competition)}`}>
                        {keyword.competition}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {keyword.intent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {keyword.rankTracking?.currentRank || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(keyword)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(keyword._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingKeyword ? 'Edit Keyword' : 'Add New Keyword'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Client */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Keyword */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keyword *
              </label>
              <input
                type="text"
                required
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g., SEO services in Oklahoma"
              />
            </div>

            {/* Keyword Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keyword Type *
              </label>
              <select
                value={formData.keywordType}
                onChange={(e) => setFormData({ ...formData, keywordType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
              </select>
            </div>

            {/* Competition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competition
              </label>
              <select
                value={formData.competition}
                onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Volume
              </label>
              <input
                type="number"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="0"
              />
            </div>

            {/* CPC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPC ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cpc}
                onChange={(e) => setFormData({ ...formData, cpc: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="0.00"
              />
            </div>

            {/* Intent */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Intent
              </label>
              <select
                value={formData.intent}
                onChange={(e) => setFormData({ ...formData, intent: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="Informational">Informational</option>
                <option value="Navigational">Navigational</option>
                <option value="Commercial">Commercial</option>
                <option value="Transactional">Transactional</option>
              </select>
            </div>

            {/* Target URL */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target URL (Optional)
              </label>
              <input
                type="url"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="https://example.com/page"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingKeyword ? 'Update' : 'Add'} Keyword
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
