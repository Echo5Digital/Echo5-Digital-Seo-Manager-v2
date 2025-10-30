import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import AuditProgressBar from '../components/AuditProgressBar'
import useAuditStore from '../store/audits'
import useClientStore from '../store/clients'
import usePagesStore from '../store/pages'
import useAuthStore from '../store/auth'
import { format } from 'date-fns'
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  DocumentMagnifyingGlassIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Audits() {
  const router = useRouter()
  const audits = useAuditStore(state => state.audits)
  const fetchAudits = useAuditStore(state => state.fetchAudits)
  const runAudit = useAuditStore(state => state.runAudit)
  const getAuditDetails = useAuditStore(state => state.getAuditDetails)
  const deleteAudit = useAuditStore(state => state.deleteAudit)
  const auditProgress = useAuditStore(state => state.auditProgress)
  
  const clients = useClientStore(state => state.clients)
  const fetchClients = useClientStore(state => state.fetchClients)
  
  const { pages, fetchPages } = usePagesStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showRunModal, setShowRunModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRawData, setShowRawData] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [showAllPages, setShowAllPages] = useState(false)
  const [excludedPages, setExcludedPages] = useState(new Set())

  const [newAudit, setNewAudit] = useState({
    clientId: '',
    url: ''
  })

  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 Starting to load audits and clients...')
      try {
        setError(null)
        await Promise.all([fetchClients(), fetchAudits()])
        console.log('✅ Successfully loaded data')
      } catch (error) {
        console.error('❌ Error loading data:', error)
        setError(error.message || 'Failed to load audits')
      } finally {
        console.log('🏁 Finished loading, setting loading to false')
        setLoading(false)
      }
    }
    loadData()
  }, [fetchClients, fetchAudits])
  
  // Fetch pages when audit details are viewed
  useEffect(() => {
    if (selectedAudit?.clientId) {
      const clientId = typeof selectedAudit.clientId === 'string' 
        ? selectedAudit.clientId 
        : selectedAudit.clientId._id;
      fetchPages(clientId);
    }
  }, [selectedAudit, fetchPages])

  // Auto-populate URL when client is selected
  useEffect(() => {
    if (newAudit.clientId) {
      const selectedClientData = clients.find(c => c._id === newAudit.clientId)
      if (selectedClientData && selectedClientData.domain) {
        setNewAudit(prev => ({ ...prev, url: selectedClientData.domain }))
      }
    } else {
      setNewAudit(prev => ({ ...prev, url: '' }))
    }
  }, [newAudit.clientId, clients])

  const filteredAudits = selectedClient
    ? audits.filter(a => a.clientId === selectedClient)
    : audits

  const getClientName = (clientData) => {
    if (!clientData) return 'Unknown'
    if (typeof clientData === 'object' && clientData.name) {
      return clientData.name
    }
    if (typeof clientData === 'string') {
      const client = clients.find(c => c._id === clientData)
      return client?.name || 'Unknown'
    }
    return 'Unknown'
  }

  const truncateUrl = (url) => {
    if (!url || typeof url !== 'string') return 'N/A'
    if (url.length <= 50) return url
    return url.substring(0, 47) + '...'
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) return 'Invalid Date'
      return format(dateObj, 'MMM dd, yyyy HH:mm')
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const handleExcludePage = async (pageUrl) => {
    try {
      const token = useAuthStore.getState().token;
      // Find the page by URL in the pages collection
      const page = pages.find(p => p.url === pageUrl);
      if (!page) {
        console.log('Page not found in database, cannot exclude');
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/${page._id}/exclude`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excluded: true })
      });
      
      if (response.ok) {
        setExcludedPages(prev => new Set([...prev, pageUrl]));
        // Refresh pages list if client is selected
        if (selectedAudit?.clientId) {
          await fetchPages(typeof selectedAudit.clientId === 'string' ? selectedAudit.clientId : selectedAudit.clientId._id);
        }
      }
    } catch (error) {
      console.error('Failed to exclude page:', error);
    }
  }

  const getScoreColorClass = (score) => {
    if (!score) return 'text-gray-400'
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getStatusBadgeClass = (status) => {
    const classes = {
      'Completed': 'badge badge-success',
      'In Progress': 'badge badge-warning',
      'Failed': 'badge badge-danger',
      'Pending': 'badge badge-info'
    }
    return classes[status] || 'badge badge-secondary'
  }

  const getSeverityClass = (severity) => {
    const classes = {
      'Critical': 'bg-red-500 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-black',
      'Low': 'bg-green-500 text-white'
    }
    return classes[severity] || 'bg-gray-500 text-white'
  }

  const hasAnyIssues = (results) => {
    if (!results) return false
    const issueTypes = [
      'brokenLinks', 'metaIssues', 'missingAltTags', 'pageSpeed',
      'schemaIssues', 'mobileIssues', 'sslIssues', 'noindexPages',
      'internalLinkingIssues', 'sitemapIssues', 'robotsTxtIssues'
    ]
    return issueTypes.some(type => results[type]?.length > 0)
  }

  const handleRunAudit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await runAudit(newAudit.clientId, newAudit.url)
      setNewAudit({ clientId: '', url: '' })
      setShowRunModal(false)
    } catch (error) {
      console.error('Error running audit:', error)
      alert('Failed to run audit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewDetails = async (auditId) => {
    router.push(`/audits-detailed?id=${auditId}`)
  }

  const handleDeleteAudit = async (auditId) => {
    if (!confirm('Are you sure you want to delete this audit?')) return
    
    try {
      await deleteAudit(auditId)
    } catch (error) {
      console.error('Error deleting audit:', error)
      alert('Failed to delete audit')
    }
  }

  const copyToClipboard = async (data) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      alert('Copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      alert('Failed to copy to clipboard')
    }
  }

  const downloadAuditData = (audit) => {
    try {
      const dataStr = JSON.stringify(audit, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-${audit._id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download audit data:', error)
      alert('Failed to download audit data')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading audits...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-red-600 mb-4">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Audits</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SEO Audits</h1>
            <p className="text-gray-600 mt-1">Analyze and improve website SEO performance</p>
          </div>
          <button
            onClick={() => setShowRunModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Run New Audit
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="input"
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audits List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No audits found. Run your first audit!
                  </td>
                </tr>
              ) : (
                filteredAudits.map(audit => (
                  <tr key={audit._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getClientName(audit.clientId)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={audit.clientId?.domain ? `https://${audit.clientId.domain}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {truncateUrl(audit.clientId?.domain)}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-2xl font-bold ${getScoreColorClass(audit.summary?.overallScore)}`}>
                        {audit.summary?.overallScore || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClass(audit.status)}>
                        {audit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(audit.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(audit._id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAudit(audit._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Run Audit Modal */}
        <Modal show={showRunModal} onClose={() => setShowRunModal(false)} title="Run New Audit">
          <form onSubmit={handleRunAudit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client
              </label>
              <select
                value={newAudit.clientId}
                onChange={(e) => setNewAudit({ ...newAudit, clientId: e.target.value })}
                required
                className="input"
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="text"
                value={newAudit.url}
                onChange={(e) => setNewAudit({ ...newAudit, url: e.target.value })}
                required
                className="input"
                placeholder="example.com"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowRunModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Running Audit...' : 'Run Audit'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Audit Details Modal */}
        <Modal show={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Audit Details">
          {selectedAudit && (
            <div className="space-y-6">
              {/* Score Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <div className="text-center">
                  <div className={`text-6xl font-bold mb-2 ${getScoreColorClass(selectedAudit.summary?.overallScore)}`}>
                    {selectedAudit.summary?.overallScore || 'N/A'}
                  </div>
                  <p className="text-gray-600">Overall SEO Score</p>
                </div>
              </div>

              {/* Issues Summary */}
              {selectedAudit.summary && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-600">{selectedAudit.summary.criticalCount || 0}</div>
                    <div className="text-sm text-gray-600">Critical Issues</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-600">{selectedAudit.summary.highCount || 0}</div>
                    <div className="text-sm text-gray-600">High Priority</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {(selectedAudit.summary.mediumCount || 0) + (selectedAudit.summary.lowCount || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Other Issues</div>
                  </div>
                </div>
              )}

              {/* Pages Discovered */}
              {selectedAudit.results?.discoveredPages?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <DocumentMagnifyingGlassIcon className="w-5 h-5 mr-2" />
                    Pages Discovered ({selectedAudit.results.discoveredPages.length})
                  </h4>
                  <div className="space-y-3">
                    {(showAllPages
                      ? selectedAudit.results.discoveredPages
                      : selectedAudit.results.discoveredPages.slice(0, 10)
                    ).map((page, index) => {
                      const isExcluded = excludedPages.has(page.url);
                      return (
                      <div key={index} className={`p-4 border border-gray-200 rounded-lg ${isExcluded ? 'bg-gray-100 opacity-50' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium text-sm flex-1"
                          >
                            {truncateUrl(page.url)}
                          </a>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{formatDate(page.discoveredAt)}</span>
                            {!isExcluded && (
                              <button
                                onClick={() => handleExcludePage(page.url)}
                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1"
                                title="Exclude from pages list"
                              >
                                <XMarkIcon className="w-3 h-3" />
                                Exclude
                              </button>
                            )}
                            {isExcluded && (
                              <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600">
                                Excluded
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-900 font-medium mb-1">
                          {page.title || 'No Title'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {page.metaDescription || 'No Meta Description'}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Status: {page.statusCode}</span>
                          <span>Size: {formatBytes(page.contentLength)}</span>
                        </div>
                      </div>
                      )
                    })}
                    {selectedAudit.results.discoveredPages.length > 10 && (
                      <div className="text-center">
                        <button
                          onClick={() => setShowAllPages(!showAllPages)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {showAllPages
                            ? 'Show Less'
                            : `Show All ${selectedAudit.results.discoveredPages.length} Pages`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Meta Analysis */}
              {selectedAudit.results?.metaAnalysis?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <InformationCircleIcon className="w-5 h-5 mr-2" />
                    Meta Tags Analysis
                  </h4>
                  <div className="space-y-3">
                    {selectedAudit.results.metaAnalysis.map((meta, index) => (
                      <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-medium text-blue-900 mb-2">
                          {truncateUrl(meta.url)}
                        </div>

                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-1">Title Tag:</div>
                          <div className="text-sm text-gray-900">{meta.title?.text || 'Missing Title'}</div>
                          <div className="text-xs text-gray-600">
                            Length: {meta.title?.length || 0} characters
                          </div>
                          {meta.title?.isTooShort && (
                            <div className="text-xs text-orange-600">⚠️ Title too short</div>
                          )}
                          {meta.title?.isTooLong && (
                            <div className="text-xs text-orange-600">⚠️ Title too long</div>
                          )}
                        </div>

                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-1">Meta Description:</div>
                          <div className="text-sm text-gray-900">
                            {meta.description?.text || 'Missing Description'}
                          </div>
                          <div className="text-xs text-gray-600">
                            Length: {meta.description?.length || 0} characters
                          </div>
                          {meta.description?.isTooShort && (
                            <div className="text-xs text-orange-600">⚠️ Description too short</div>
                          )}
                          {meta.description?.isTooLong && (
                            <div className="text-xs text-orange-600">⚠️ Description too long</div>
                          )}
                        </div>

                        {meta.issues?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {meta.issues.map(issue => (
                              <span
                                key={issue.type}
                                className={`inline-block px-2 py-1 text-xs rounded-full ${getSeverityClass(issue.severity)}`}
                              >
                                {issue.type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images Analysis */}
              {selectedAudit.results?.imageAnalysis?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                    Images & Alt Tags Analysis
                  </h4>
                  <div className="space-y-3">
                    {selectedAudit.results.imageAnalysis.map((imageData, index) => (
                      <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm font-medium text-yellow-900 mb-2">
                          {truncateUrl(imageData.url)}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">{imageData.totalImages}</div>
                            <div className="text-xs text-gray-600">Total Images</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{imageData.imagesWithAlt}</div>
                            <div className="text-xs text-gray-600">With Alt Tags</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{imageData.imagesWithoutAlt}</div>
                            <div className="text-xs text-gray-600">Without Alt Tags</div>
                          </div>
                        </div>

                        {imageData.images?.some(img => !img.hasAlt) && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              Images Missing Alt Tags:
                            </div>
                            <div className="space-y-1">
                              {imageData.images
                                .filter(img => !img.hasAlt)
                                .slice(0, 5)
                                .map((img, i) => (
                                  <div key={i} className="text-xs text-gray-600 truncate">
                                    {img.src}
                                  </div>
                                ))}
                              {imageData.images.filter(img => !img.hasAlt).length > 5 && (
                                <div className="text-xs text-gray-500">
                                  ... and {imageData.images.filter(img => !img.hasAlt).length - 5} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {imageData.issues?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {imageData.issues.map(issue => (
                              <span
                                key={issue.type}
                                className={`inline-block px-2 py-1 text-xs rounded-full ${getSeverityClass(issue.severity)}`}
                              >
                                {issue.type} ({issue.count})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Data Section */}
              <div className="mt-6">
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="text-blue-600 hover:underline text-sm mb-3"
                >
                  {showRawData ? 'Hide' : 'Show'} Raw Audit Data
                </button>

                {showRawData && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-800 mb-3">Complete Audit Object (Raw JSON)</h5>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => copyToClipboard(selectedAudit)}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        Copy to Clipboard
                      </button>
                      <button
                        onClick={() => downloadAuditData(selectedAudit)}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                      >
                        Download JSON
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 rounded p-4 text-xs overflow-auto max-h-96">
                      {JSON.stringify(selectedAudit, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Real-time Audit Progress Modal */}
        {auditProgress.isRunning && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
              
              <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center">
                  {/* Loading GIF */}
                  <div className="mb-4 flex justify-center">
                    <img 
                      src="/echo5-loading.gif" 
                      alt="Loading..." 
                      className="w-32 h-32 object-contain"
                    />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">Running Audit</h3>
                  <p className="text-sm text-gray-600 mb-4">{auditProgress.step}</p>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${auditProgress.progress}%` }}
                    ></div>
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    {Math.round(auditProgress.progress)}% Complete
                  </p>

                  {/* Status Steps */}
                  <div className="text-left bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {auditProgress.steps.map((step, index) => {
                      const currentStepIndex = auditProgress.steps.indexOf(auditProgress.step)
                      const isCompleted = index < currentStepIndex
                      const isCurrent = index === currentStepIndex
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 mb-2 text-sm ${
                            isCompleted ? 'text-green-600' : isCurrent ? 'text-indigo-600 font-semibold' : 'text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : isCurrent ? (
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                          )}
                          <span>{step}</span>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    Please wait while we analyze your website...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <AuditProgressBar />
      </div>
    </Layout>
  )
}
