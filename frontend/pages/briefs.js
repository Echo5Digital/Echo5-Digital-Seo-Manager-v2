import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import useAuthStore from '../store/auth'
import useBlogStore from '../store/blogs'
import useClientStore from '../store/clients'
import { 
  DocumentTextIcon, 
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

export default function Briefs() {
  const router = useRouter()
  const { token } = useAuthStore()
  const { blogs, loading, fetchBlogs, deleteBlog } = useBlogStore()
  const { clients, fetchClients } = useClientStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    if (token) {
      fetchBlogs(token)
      fetchClients()
    }
  }, [token])

  const filteredBriefs = blogs.filter(blog => {
    const matchesSearch = blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.focusKeyword?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClient = !selectedClient || blog.clientId?._id === selectedClient || blog.clientId === selectedClient
    const matchesStatus = selectedStatus === 'all' || blog.status === selectedStatus
    
    return matchesSearch && matchesClient && matchesStatus
  })

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this brief?')) {
      await deleteBlog(token, id)
      fetchBlogs(token)
    }
  }

  const handleView = (id) => {
    router.push(`/briefs/${id}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-2">
              <DocumentTextIcon className="w-8 h-8 text-white" />
            </div>
            Blog Briefs
          </h1>
          <p className="text-gray-600 mt-1">Manage all your saved blog content briefs</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Client Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-700">{blogs.length}</div>
            <div className="text-sm text-blue-600">Total Briefs</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-700">
              {blogs.filter(b => b.status === 'draft').length}
            </div>
            <div className="text-sm text-purple-600">Drafts</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-700">
              {blogs.filter(b => b.status === 'review').length}
            </div>
            <div className="text-sm text-yellow-600">In Review</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-700">
              {blogs.filter(b => b.status === 'published').length}
            </div>
            <div className="text-sm text-green-600">Published</div>
          </div>
        </div>

        {/* Briefs List */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading briefs...</p>
          </div>
        ) : filteredBriefs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No briefs found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedClient || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first blog brief to get started'}
            </p>
            <button
              onClick={() => router.push('/blog-creator')}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
            >
              Create Blog Brief
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBriefs.map(brief => (
              <div
                key={brief._id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-2">
                        <DocumentTextIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {brief.title || brief.metaTitle}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {brief.metaDescription}
                        </p>
                        
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(brief.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">Client:</span>
                            {typeof brief.clientId === 'object' ? brief.clientId?.name : 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">Keyword:</span>
                            {brief.focusKeyword}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">Words:</span>
                            {brief.wordCount || 'N/A'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(brief.status)}`}>
                            {brief.status || 'draft'}
                          </span>
                          {brief.faqs && brief.faqs.length > 0 && (
                            <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {brief.faqs.length} FAQs
                            </span>
                          )}
                          {brief.semanticKeywords && brief.semanticKeywords.length > 0 && (
                            <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {brief.semanticKeywords.length} Keywords
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleView(brief._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(brief._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
