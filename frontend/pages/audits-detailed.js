import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import useAuditStore from '../store/audits'
import useClientStore from '../store/clients'
import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  DocumentMagnifyingGlassIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

export default function AuditDetailed() {
  const router = useRouter()
  const { id } = router.query
  
  const getAuditDetails = useAuditStore(state => state.getAuditDetails)
  const clients = useClientStore(state => state.clients)
  const fetchClients = useClientStore(state => state.fetchClients)
  
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPageIndex, setSelectedPageIndex] = useState(null)
  const [viewMode, setViewMode] = useState('overview') // 'overview' or 'page-detail'
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all') // 'all', 'critical', 'opportunities', 'good'
  const [sortBy, setSortBy] = useState('index') // 'index', 'score', 'issues'
  const [collapsedSections, setCollapsedSections] = useState({
    discoveredPages: false,
    seoAnalysis: false,
    metaAnalysis: true,  // Collapsed by default
    headingStructure: true,  // Collapsed by default
    imageAnalysis: true,  // Collapsed by default
    linkAnalysis: true,  // Collapsed by default
    contentAnalysis: true  // Collapsed by default
  })

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const selectPage = (index) => {
    setSelectedPageIndex(index)
    setViewMode('page-detail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const backToOverview = () => {
    setSelectedPageIndex(null)
    setViewMode('overview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      try {
        await fetchClients()
        const auditData = await getAuditDetails(id)
        console.log('📊 Loaded audit data:', auditData)
        console.log('� Full results object:', auditData?.results)
        console.log('�📄 Discovered pages:', auditData?.results?.discoveredPages?.length || 0)
        console.log('🔍 Page analysis:', auditData?.results?.pageAnalysis?.length || 0)
        console.log('🗂️ Results keys:', auditData?.results ? Object.keys(auditData.results) : 'No results')
        console.log('📋 First discovered page:', auditData?.results?.discoveredPages?.[0])
        setAudit(auditData)
      } catch (error) {
        console.error('Error loading audit:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, getAuditDetails, fetchClients])

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

  const getSeverityClass = (severity) => {
    const classes = {
      'Critical': 'bg-red-500 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-black',
      'Low': 'bg-green-500 text-white'
    }
    return classes[severity] || 'bg-gray-500 text-white'
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

  if (!audit) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Audit Not Found</h2>
          <button onClick={() => router.push('/audits')} className="btn btn-primary">
            Back to Audits
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        {/* Header - Improved Layout */}
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border-b-4 border-blue-500">
          <button
            onClick={() => router.push('/audits')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Audits
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const allCollapsed = Object.values(collapsedSections).every(v => v);
                setCollapsedSections({
                  discoveredPages: !allCollapsed,
                  seoAnalysis: !allCollapsed,
                  metaAnalysis: !allCollapsed,
                  headingStructure: !allCollapsed,
                  imageAnalysis: !allCollapsed,
                  linkAnalysis: !allCollapsed,
                  contentAnalysis: !allCollapsed
                });
              }}
              className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              {Object.values(collapsedSections).every(v => v) ? '📂 Expand All' : '📁 Collapse All'}
            </button>
            <span className="text-sm text-gray-600 font-medium border-l pl-3">Export:</span>
            <button
              onClick={() => {
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
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              📥 Download Report
            </button>
          </div>
        </div>

        {/* Audit Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-3">
                {getClientName(audit.clientId)}
              </h1>
              <p className="text-blue-100 text-lg mb-2">{audit.clientId?.domain || 'N/A'}</p>
              <p className="text-sm text-blue-200">
                📅 Audited on {formatDate(audit.createdAt)}
              </p>
              <p className="text-sm text-blue-200">
                Status: <span className="font-semibold">{audit.status}</span>
              </p>
            </div>
            <div className="text-right bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <div className="text-6xl font-bold mb-2">
                {audit.summary?.overallScore || 'N/A'}
              </div>
              <p className="text-sm text-blue-100">Overall SEO Score</p>
            </div>
          </div>
        </div>

        {/* Issues Summary */}
        {audit.summary && (
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-red-600 mb-2">{audit.summary.criticalCount || 0}</div>
              <div className="text-sm font-semibold text-red-900">🔴 Critical Issues</div>
              <div className="text-xs text-red-600 mt-1">Immediate Action Required</div>
            </div>
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-orange-600 mb-2">{audit.summary.highCount || 0}</div>
              <div className="text-sm font-semibold text-orange-900">🟠 High Priority</div>
              <div className="text-xs text-orange-600 mt-1">Address Soon</div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-yellow-600 mb-2">{audit.summary.mediumCount || 0}</div>
              <div className="text-sm font-semibold text-yellow-900">🟡 Medium Priority</div>
              <div className="text-xs text-yellow-600 mt-1">Plan to Fix</div>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-green-600 mb-2">{audit.summary.lowCount || 0}</div>
              <div className="text-sm font-semibold text-green-900">🟢 Low Priority</div>
              <div className="text-xs text-green-600 mt-1">Minor Improvements</div>
            </div>
          </div>
        )}

        {/* Content Summary */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center">
            📊 Audit Content Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {audit.results?.discoveredPages?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Pages Discovered</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {audit.results?.pageAnalysis?.length || 0}
              </div>
              <div className="text-xs text-gray-600">SEO Analyses</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {audit.results?.metaAnalysis?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Meta Tags Analyzed</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {audit.results?.headingStructure?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Heading Structures</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-indigo-700 text-center">
            💡 Click on any page below to view detailed analysis
          </div>
        </div>

        {/* View Mode Toggle */}
        {viewMode === 'page-detail' && selectedPageIndex !== null && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 flex items-center justify-between">
            <button
              onClick={backToOverview}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back to All Pages
            </button>
            <div className="text-blue-900 font-semibold">
              Viewing: Page {selectedPageIndex + 1} of {audit.results?.discoveredPages?.length || 0}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {audit.aiAnalysis && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-purple-900 mb-4 flex items-center">
              🤖 AI-Powered Analysis & Recommendations
            </h2>
            {typeof audit.aiAnalysis === 'string' ? (
              <div className="prose prose-lg max-w-none text-gray-800 whitespace-pre-wrap">
                {audit.aiAnalysis}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Executive Summary */}
                {audit.aiAnalysis.executiveSummary && (
                  <div className="bg-white p-5 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-purple-900 mb-3">📊 Executive Summary</h3>
                    <p className="text-gray-800">{audit.aiAnalysis.executiveSummary}</p>
                  </div>
                )}

                {/* Top Priorities */}
                {audit.aiAnalysis.topPriorities && audit.aiAnalysis.topPriorities.length > 0 && (
                  <div className="bg-white p-5 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-red-900 mb-3">🔴 Top Priorities</h3>
                    <ul className="space-y-2">
                      {audit.aiAnalysis.topPriorities.map((priority, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-red-600 font-bold mt-1">•</span>
                          <span className="text-gray-800">{priority}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Wins */}
                {audit.aiAnalysis.quickWins && audit.aiAnalysis.quickWins.length > 0 && (
                  <div className="bg-white p-5 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-green-900 mb-3">⚡ Quick Wins</h3>
                    <ul className="space-y-2">
                      {audit.aiAnalysis.quickWins.map((win, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-1">✓</span>
                          <span className="text-gray-800">{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Long Term Actions */}
                {audit.aiAnalysis.longTermActions && audit.aiAnalysis.longTermActions.length > 0 && (
                  <div className="bg-white p-5 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-blue-900 mb-3">🎯 Long-Term Actions</h3>
                    <ul className="space-y-2">
                      {audit.aiAnalysis.longTermActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-blue-600 font-bold mt-1">→</span>
                          <span className="text-gray-800">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Estimated Impact */}
                {audit.aiAnalysis.estimatedImpact && (
                  <div className="bg-white p-5 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-purple-900 mb-3">📈 Estimated Impact</h3>
                    <p className="text-gray-800">{audit.aiAnalysis.estimatedImpact}</p>
                  </div>
                )}

                {/* Analyzed Date */}
                {audit.aiAnalysis.analyzedAt && (
                  <div className="text-sm text-purple-700">
                    Analysis performed: {formatDate(audit.aiAnalysis.analyzedAt)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAGES TABLE VIEW - Overview Mode */}
        {viewMode === 'overview' && audit.results?.discoveredPages?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="border-b-4 border-blue-500 pb-6 mb-6">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center mb-4">
                <DocumentMagnifyingGlassIcon className="w-8 h-8 mr-3 text-blue-600" />
                All Discovered Pages ({audit.results.discoveredPages.length})
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Click on any row to view detailed SEO analysis, issues, and recommendations for that specific page.
              </p>

              {/* Search and Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Search by URL or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Filter Dropdown */}
                <div>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="all">📊 All Pages</option>
                    <option value="critical">🔴 Critical Issues Only</option>
                    <option value="opportunities">⚠️ Has Opportunities</option>
                    <option value="good">✅ Good SEO Score (80+)</option>
                    <option value="needs-work">⚡ Needs Work (&lt;60)</option>
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="index">🔢 Page Order</option>
                    <option value="score-desc">📈 SEO Score (High to Low)</option>
                    <option value="score-asc">📉 SEO Score (Low to High)</option>
                    <option value="issues-desc">🔴 Most Issues First</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchTerm || filterBy !== 'all' || sortBy !== 'index') && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="text-blue-600 hover:text-blue-800">✕</button>
                    </span>
                  )}
                  {filterBy !== 'all' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      Filter: {filterBy}
                      <button onClick={() => setFilterBy('all')} className="text-purple-600 hover:text-purple-800">✕</button>
                    </span>
                  )}
                  {sortBy !== 'index' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Sort: {sortBy}
                      <button onClick={() => setSortBy('index')} className="text-green-600 hover:text-green-800">✕</button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterBy('all');
                      setSortBy('index');
                    }}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto shadow-lg rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                    <th className="p-4 font-bold text-sm">#</th>
                    <th className="p-4 font-bold text-sm">Page URL</th>
                    <th className="p-4 font-bold text-sm">Title</th>
                    <th className="p-4 font-bold text-sm text-center">Status</th>
                    <th className="p-4 font-bold text-sm text-center">SEO Score</th>
                    <th className="p-4 font-bold text-sm text-center">Issues</th>
                    <th className="p-4 font-bold text-sm text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Filter and sort pages
                    let filteredPages = audit.results.discoveredPages.map((page, index) => ({
                      ...page,
                      originalIndex: index,
                      pageAnalysis: audit.results?.pageAnalysis?.find(p => p.url === page.url),
                    }));

                    // Apply search
                    if (searchTerm) {
                      filteredPages = filteredPages.filter(item => 
                        item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.title?.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    }

                    // Apply filter
                    if (filterBy === 'critical') {
                      filteredPages = filteredPages.filter(item => 
                        (item.pageAnalysis?.seoAnalysis?.criticalIssues?.length || 0) > 0
                      );
                    } else if (filterBy === 'opportunities') {
                      filteredPages = filteredPages.filter(item => 
                        (item.pageAnalysis?.seoAnalysis?.opportunities?.length || 0) > 0
                      );
                    } else if (filterBy === 'good') {
                      filteredPages = filteredPages.filter(item => 
                        (item.pageAnalysis?.seoAnalysis?.seoScore || 0) >= 80
                      );
                    } else if (filterBy === 'needs-work') {
                      filteredPages = filteredPages.filter(item => 
                        (item.pageAnalysis?.seoAnalysis?.seoScore || 0) < 60
                      );
                    }

                    // Apply sort
                    if (sortBy === 'score-desc') {
                      filteredPages.sort((a, b) => 
                        (b.pageAnalysis?.seoAnalysis?.seoScore || 0) - (a.pageAnalysis?.seoAnalysis?.seoScore || 0)
                      );
                    } else if (sortBy === 'score-asc') {
                      filteredPages.sort((a, b) => 
                        (a.pageAnalysis?.seoAnalysis?.seoScore || 0) - (b.pageAnalysis?.seoAnalysis?.seoScore || 0)
                      );
                    } else if (sortBy === 'issues-desc') {
                      filteredPages.sort((a, b) => {
                        const aIssues = (a.pageAnalysis?.seoAnalysis?.criticalIssues?.length || 0) + 
                                       (a.pageAnalysis?.seoAnalysis?.opportunities?.length || 0);
                        const bIssues = (b.pageAnalysis?.seoAnalysis?.criticalIssues?.length || 0) + 
                                       (b.pageAnalysis?.seoAnalysis?.opportunities?.length || 0);
                        return bIssues - aIssues;
                      });
                    }

                    if (filteredPages.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">🔍</div>
                            <div className="font-semibold">No pages found matching your criteria</div>
                            <button
                              onClick={() => {
                                setSearchTerm('');
                                setFilterBy('all');
                                setSortBy('index');
                              }}
                              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Clear Filters
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return filteredPages.map((item, displayIndex) => {
                      const seoScore = item.pageAnalysis?.seoAnalysis?.seoScore || 'N/A';
                      const criticalIssues = item.pageAnalysis?.seoAnalysis?.criticalIssues?.length || 0;
                      const opportunities = item.pageAnalysis?.seoAnalysis?.opportunities?.length || 0;
                      const totalIssues = criticalIssues + opportunities;
                      
                      return (
                        <tr 
                          key={item.originalIndex} 
                          className={`border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all cursor-pointer ${
                            displayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                          onClick={() => selectPage(item.originalIndex)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">{item.originalIndex + 1}</span>
                              {totalIssues > 5 && (
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="High priority"></span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-blue-600 font-medium text-sm hover:underline max-w-md truncate" title={item.url}>
                              {item.url}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-gray-900 font-medium text-sm max-w-xs truncate" title={item.title}>
                              {item.title || '⚠️ No Title'}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              item.statusCode === 200 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                              {item.statusCode}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-3xl font-bold ${
                                seoScore >= 80 ? 'text-green-600' :
                                seoScore >= 60 ? 'text-yellow-600' :
                                seoScore >= 40 ? 'text-orange-600' :
                                seoScore === 'N/A' ? 'text-gray-400' :
                                'text-red-600'
                              }`}>
                                {seoScore}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                {seoScore >= 80 ? 'Excellent' :
                                 seoScore >= 60 ? 'Good' :
                                 seoScore >= 40 ? 'Fair' :
                                 seoScore === 'N/A' ? 'N/A' :
                                 'Poor'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 items-center">
                              {criticalIssues > 0 && (
                                <span className="text-xs bg-red-500 text-white px-3 py-1 rounded-full font-bold shadow-md">
                                  🔴 {criticalIssues} Critical
                                </span>
                              )}
                              {opportunities > 0 && (
                                <span className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-full font-bold shadow-md">
                                  ⚠️ {opportunities} To Fix
                                </span>
                              )}
                              {criticalIssues === 0 && opportunities === 0 && (
                                <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-bold shadow-md">
                                  ✅ Clean
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectPage(item.originalIndex);
                              }}
                              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                            >
                              View Details →
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
```
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SINGLE PAGE DETAIL VIEW */}
        {viewMode === 'page-detail' && selectedPageIndex !== null && (() => {
          const page = audit.results.discoveredPages[selectedPageIndex];
          const pageAnalysis = audit.results?.pageAnalysis?.find(p => p.url === page.url);
          const pageMeta = audit.results?.metaAnalysis?.find(m => m.url === page.url);
          const pageHeading = audit.results?.headingStructure?.find(h => h.url === page.url);
          const pageImage = audit.results?.imageAnalysis?.find(i => i.url === page.url);
          
          return (
            <div className="space-y-6">
              {/* Page Header Card - Enhanced */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-2xl p-8 border-2 border-blue-200">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                        Page {selectedPageIndex + 1} of {audit.results.discoveredPages.length}
                      </span>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                        page.statusCode === 200 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        Status: {page.statusCode}
                      </span>
                    </div>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl font-bold text-blue-600 hover:text-blue-800 hover:underline break-all block mb-4 transition-colors"
                    >
                      🔗 {page.url}
                    </a>
                    <div className="bg-white rounded-lg p-4 mb-3 shadow-md">
                      <div className="text-sm text-gray-600 mb-1">Page Title:</div>
                      <div className="text-xl font-bold text-gray-900">
                        📄 {page.title || '⚠️ No Title'}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-md">
                      <div className="text-sm text-gray-600 mb-1">Meta Description:</div>
                      <div className="text-sm text-gray-700">
                        📝 {page.metaDescription || '⚠️ No Meta Description'}
                      </div>
                    </div>
                  </div>
                  
                  {/* SEO Score Badge */}
                  <div className="ml-6">
                    {pageAnalysis?.seoAnalysis?.seoScore ? (
                      <div className="bg-white rounded-2xl p-6 text-center shadow-2xl border-4 border-gray-200">
                        <div className={`text-7xl font-black mb-2 ${
                          pageAnalysis.seoAnalysis.seoScore >= 80 ? 'text-green-600' :
                          pageAnalysis.seoAnalysis.seoScore >= 60 ? 'text-yellow-600' :
                          pageAnalysis.seoAnalysis.seoScore >= 40 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {pageAnalysis.seoAnalysis.seoScore}
                        </div>
                        <div className="text-xs text-gray-600 font-bold mb-2">SEO SCORE</div>
                        <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                          pageAnalysis.seoAnalysis.seoScore >= 80 ? 'bg-green-100 text-green-800' :
                          pageAnalysis.seoAnalysis.seoScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          pageAnalysis.seoAnalysis.seoScore >= 40 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {pageAnalysis.seoAnalysis.seoScore >= 80 ? '✨ Excellent' :
                           pageAnalysis.seoAnalysis.seoScore >= 60 ? '👍 Good' :
                           pageAnalysis.seoAnalysis.seoScore >= 40 ? '⚠️ Fair' :
                           '🔴 Needs Work'}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-xl p-6 text-center">
                        <div className="text-4xl text-gray-400">N/A</div>
                        <div className="text-xs text-gray-500">No Score</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                  <div className="bg-white p-4 rounded-xl shadow-md text-center border-l-4 border-blue-500">
                    <div className="text-sm text-gray-600 mb-1 font-semibold">Size</div>
                    <div className="text-lg font-bold text-blue-900">{formatBytes(page.contentLength)}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-md text-center border-l-4 border-purple-500">
                    <div className="text-sm text-gray-600 mb-1 font-semibold">Load Time</div>
                    <div className="text-lg font-bold text-purple-900">{page.loadTime || 'N/A'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-md text-center border-l-4 border-green-500">
                    <div className="text-sm text-gray-600 mb-1 font-semibold">Word Count</div>
                    <div className="text-lg font-bold text-green-900">{pageAnalysis?.content?.wordCount || 'N/A'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-md text-center border-l-4 border-orange-500">
                    <div className="text-sm text-gray-600 mb-1 font-semibold">Images</div>
                    <div className="text-lg font-bold text-orange-900">
                      {pageImage?.withAlt || 0}/{pageImage?.totalImages || 0}
                    </div>
                    <div className="text-xs text-gray-500">With Alt</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-md text-center border-l-4 border-red-500">
                    <div className="text-sm text-gray-600 mb-1 font-semibold">Total Issues</div>
                    <div className="text-lg font-bold text-red-900">
                      {(pageAnalysis?.seoAnalysis?.criticalIssues?.length || 0) + 
                       (pageAnalysis?.seoAnalysis?.opportunities?.length || 0)}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    🌐 Visit Page
                  </a>
                  <button
                    onClick={() => {
                      const issuesList = [
                        ...(pageAnalysis?.seoAnalysis?.criticalIssues || []).map(i => `🔴 CRITICAL: ${i}`),
                        ...(pageAnalysis?.seoAnalysis?.opportunities || []).map(i => `⚠️ TO FIX: ${i}`),
                      ].join('\n');
                      navigator.clipboard.writeText(`Page: ${page.url}\n\nIssues:\n${issuesList}`);
                      alert('Issues copied to clipboard!');
                    }}
                    className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    📋 Copy Issues
                  </button>
                  <button
                    onClick={() => {
                      if (selectedPageIndex > 0) selectPage(selectedPageIndex - 1);
                    }}
                    disabled={selectedPageIndex === 0}
                    className={`px-5 py-3 font-bold rounded-lg shadow-md transition-all flex items-center gap-2 ${
                      selectedPageIndex === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-600 hover:bg-gray-700 text-white hover:shadow-lg'
                    }`}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => {
                      if (selectedPageIndex < audit.results.discoveredPages.length - 1) {
                        selectPage(selectedPageIndex + 1);
                      }
                    }}
                    disabled={selectedPageIndex === audit.results.discoveredPages.length - 1}
                    className={`px-5 py-3 font-bold rounded-lg shadow-md transition-all flex items-center gap-2 ${
                      selectedPageIndex === audit.results.discoveredPages.length - 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-600 hover:bg-gray-700 text-white hover:shadow-lg'
                    }`}
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* PRIORITY SUMMARY CARD */}
              {pageAnalysis?.seoAnalysis && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-xl p-6 border-2 border-orange-300">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    🎯 Action Items Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-5 shadow-md border-l-4 border-red-500">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-600 font-semibold mb-1">Critical Issues</div>
                          <div className="text-3xl font-black text-red-600">
                            {pageAnalysis.seoAnalysis.criticalIssues?.length || 0}
                          </div>
                        </div>
                        <div className="text-4xl">🔴</div>
                      </div>
                      <div className="text-xs text-red-700 mt-2 font-medium">Fix immediately for best results</div>
                    </div>
                    <div className="bg-white rounded-lg p-5 shadow-md border-l-4 border-yellow-500">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-600 font-semibold mb-1">Opportunities</div>
                          <div className="text-3xl font-black text-yellow-600">
                            {pageAnalysis.seoAnalysis.opportunities?.length || 0}
                          </div>
                        </div>
                        <div className="text-4xl">⚠️</div>
                      </div>
                      <div className="text-xs text-yellow-700 mt-2 font-medium">Improvements to consider</div>
                    </div>
                    <div className="bg-white rounded-lg p-5 shadow-md border-l-4 border-green-500">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-600 font-semibold mb-1">Good Practices</div>
                          <div className="text-3xl font-black text-green-600">
                            {pageAnalysis.seoAnalysis.recommendations?.length || 0}
                          </div>
                        </div>
                        <div className="text-4xl">✅</div>
                      </div>
                      <div className="text-xs text-green-700 mt-2 font-medium">Already doing well</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEO ISSUES FOR THIS PAGE */}
              {pageAnalysis?.seoAnalysis && (
                <div className="bg-white rounded-xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold text-orange-900 mb-6 flex items-center border-b-4 border-orange-500 pb-4">
                    <ExclamationTriangleIcon className="w-7 h-7 mr-3 text-orange-600" />
                    Detailed SEO Analysis
                  </h3>

                  {/* Critical Issues */}
                  {pageAnalysis.seoAnalysis.criticalIssues?.length > 0 && (
                    <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-600 p-6 rounded-lg shadow-md">
                      <h4 className="text-xl font-bold text-red-900 mb-4 flex items-center">
                        🔴 Critical Issues ({pageAnalysis.seoAnalysis.criticalIssues.length}) - Fix These First!
                      </h4>
                      <ul className="space-y-3">
                        {pageAnalysis.seoAnalysis.criticalIssues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-4 bg-white p-5 rounded-lg shadow-sm border-l-4 border-red-400 hover:shadow-md transition-shadow">
                            <span className="text-red-600 font-bold text-2xl mt-0.5 flex-shrink-0">#{idx + 1}</span>
                            <span className="text-red-900 font-medium text-base">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {pageAnalysis.seoAnalysis.opportunities?.length > 0 && (
                    <div className="mb-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-600 p-6 rounded-lg shadow-md">
                      <h4 className="text-xl font-bold text-yellow-900 mb-4 flex items-center">
                        ⚠️ Improvement Opportunities ({pageAnalysis.seoAnalysis.opportunities.length}) - Consider These
                      </h4>
                      <ul className="space-y-3">
                        {pageAnalysis.seoAnalysis.opportunities.map((opportunity, idx) => (
                          <li key={idx} className="flex items-start gap-4 bg-white p-5 rounded-lg shadow-sm border-l-4 border-yellow-400 hover:shadow-md transition-shadow">
                            <span className="text-yellow-600 font-bold text-2xl mt-0.5 flex-shrink-0">#{idx + 1}</span>
                            <span className="text-yellow-900 font-medium text-base">{opportunity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {pageAnalysis.seoAnalysis.recommendations?.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-600 p-6 rounded-lg shadow-md">
                      <h4 className="text-xl font-bold text-green-900 mb-4 flex items-center">
                        ✅ Good Practices ({pageAnalysis.seoAnalysis.recommendations.length}) - Keep It Up!
                      </h4>
                      <ul className="space-y-3">
                        {pageAnalysis.seoAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-4 bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-400 hover:shadow-md transition-shadow">
                            <span className="text-green-600 font-bold text-2xl mt-0.5 flex-shrink-0">✓</span>
                            <span className="text-green-900 font-medium text-base">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* No Issues Message */}
                  {(!pageAnalysis.seoAnalysis.criticalIssues?.length && 
                    !pageAnalysis.seoAnalysis.opportunities?.length && 
                    !pageAnalysis.seoAnalysis.recommendations?.length) && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-6xl mb-4">🎉</div>
                      <div className="text-xl font-bold text-gray-700 mb-2">No SEO Analysis Available</div>
                      <div className="text-gray-500">This page may not have been fully analyzed yet.</div>
                    </div>
                  )}
                </div>
              )}

              {/* META TAGS FOR THIS PAGE */}
              {pageMeta && (
                <div className="bg-white rounded-xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold text-purple-900 mb-6 flex items-center border-b-4 border-purple-500 pb-4">
                    <InformationCircleIcon className="w-7 h-7 mr-3 text-purple-600" />
                    Meta Tags Analysis
                  </h3>

                  <div className="space-y-6">
                    {/* Title Analysis */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border-l-4 border-blue-500">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-blue-900 text-lg">📌 Title Tag</div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${
                          pageMeta.title?.length >= 30 && pageMeta.title?.length <= 60 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {pageMeta.title?.length || 0} characters
                        </span>
                      </div>
                      <div className="text-lg text-gray-900 mb-3 font-semibold bg-white p-4 rounded-lg">
                        {pageMeta.title?.text || '❌ Missing Title'}
                      </div>
                      {pageMeta.title?.isTooShort && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg font-medium">
                          ⚠️ Title is too short (recommended: 30-60 characters)
                        </div>
                      )}
                      {pageMeta.title?.isTooLong && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg font-medium">
                          ⚠️ Title is too long and may be truncated in search results
                        </div>
                      )}
                      {!pageMeta.title?.text && (
                        <div className="text-sm text-red-900 bg-red-100 p-3 rounded-lg font-medium">
                          🔴 Critical: Missing title tag - essential for SEO
                        </div>
                      )}
                    </div>

                    {/* Description Analysis */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border-l-4 border-green-500">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-green-900 text-lg">📝 Meta Description</div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${
                          pageMeta.description?.length >= 120 && pageMeta.description?.length <= 160 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {pageMeta.description?.length || 0} characters
                        </span>
                      </div>
                      <div className="text-base text-gray-900 mb-3 bg-white p-4 rounded-lg">
                        {pageMeta.description?.text || '❌ Missing Description'}
                      </div>
                      {pageMeta.description?.isTooShort && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg font-medium">
                          ⚠️ Description is too short (recommended: 120-160 characters)
                        </div>
                      )}
                      {pageMeta.description?.isTooLong && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg font-medium">
                          ⚠️ Description is too long and may be truncated
                        </div>
                      )}
                      {!pageMeta.description?.text && (
                        <div className="text-sm text-red-900 bg-red-100 p-3 rounded-lg font-medium">
                          🟠 High Priority: Missing meta description
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* HEADING STRUCTURE FOR THIS PAGE */}
              {pageHeading && (
                <div className="bg-white rounded-xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center border-b-4 border-indigo-500 pb-4">
                    <svg className="w-7 h-7 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Heading Structure
                  </h3>

                  <div className="grid grid-cols-6 gap-4 mb-6">
                    <div className="bg-indigo-50 p-4 rounded-lg text-center border-t-4 border-indigo-600">
                      <div className="text-3xl font-bold text-indigo-900 mb-1">{pageHeading.h1Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H1</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center border-t-4 border-blue-600">
                      <div className="text-3xl font-bold text-blue-900 mb-1">{pageHeading.h2Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H2</div>
                    </div>
                    <div className="bg-cyan-50 p-4 rounded-lg text-center border-t-4 border-cyan-600">
                      <div className="text-3xl font-bold text-cyan-900 mb-1">{pageHeading.h3Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H3</div>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg text-center border-t-4 border-teal-600">
                      <div className="text-3xl font-bold text-teal-900 mb-1">{pageHeading.h4Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H4</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center border-t-4 border-green-600">
                      <div className="text-3xl font-bold text-green-900 mb-1">{pageHeading.h5Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H5</div>
                    </div>
                    <div className="bg-lime-50 p-4 rounded-lg text-center border-t-4 border-lime-600">
                      <div className="text-3xl font-bold text-lime-900 mb-1">{pageHeading.h6Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H6</div>
                    </div>
                  </div>

                  {pageHeading.headings && pageHeading.headings.length > 0 && (
                    <div className="bg-gray-50 p-6 rounded-xl">
                      <div className="font-bold text-gray-900 mb-4 text-lg">
                        All Headings ({pageHeading.headings.length}):
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {pageHeading.headings.map((h, hIdx) => {
                          const levelDisplay = typeof h.level === 'number' 
                            ? `H${h.level}` 
                            : (typeof h.level === 'string' && h.level ? h.level.toUpperCase() : 'H?');
                          
                          return (
                            <div key={hIdx} className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex-shrink-0 ${
                                h.level === 1 || h.level === 'h1' ? 'bg-indigo-600 text-white' :
                                h.level === 2 || h.level === 'h2' ? 'bg-blue-600 text-white' :
                                h.level === 3 || h.level === 'h3' ? 'bg-cyan-600 text-white' :
                                h.level === 4 || h.level === 'h4' ? 'bg-teal-600 text-white' :
                                h.level === 5 || h.level === 'h5' ? 'bg-green-600 text-white' :
                                'bg-lime-600 text-white'
                              }`}>
                                {levelDisplay}
                              </span>
                              <span className="text-sm text-gray-900 font-medium">{h.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pageHeading.issues?.length > 0 && (
                    <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                      <h4 className="font-bold text-red-900 mb-3">Issues Found:</h4>
                      <div className="flex flex-wrap gap-3">
                        {pageHeading.issues.map((issue, issueIdx) => (
                          <span
                            key={issueIdx}
                            className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full shadow-md ${
                              issue.severity === 'Critical' ? 'bg-red-500 text-white' :
                              issue.severity === 'High' ? 'bg-orange-500 text-white' :
                              issue.severity === 'Medium' ? 'bg-yellow-500 text-white' :
                              'bg-green-500 text-white'
                            }`}
                          >
                            {issue.severity === 'Critical' && '🔴 '}
                            {issue.severity === 'High' && '🟠 '}
                            {issue.severity === 'Medium' && '🟡 '}
                            {issue.severity === 'Low' && '🟢 '}
                            {issue.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IMAGE ANALYSIS FOR THIS PAGE */}
              {pageImage && (
                <div className="bg-white rounded-xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold text-yellow-900 mb-6 flex items-center border-b-4 border-yellow-500 pb-4">
                    <svg className="w-7 h-7 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Images & Alt Tags
                  </h3>

                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="bg-blue-50 p-6 rounded-xl text-center border-t-4 border-blue-600">
                      <div className="text-4xl font-bold text-blue-900 mb-2">{pageImage.totalImages || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">Total Images</div>
                    </div>
                    <div className="bg-green-50 p-6 rounded-xl text-center border-t-4 border-green-600">
                      <div className="text-4xl font-bold text-green-900 mb-2">{pageImage.withAlt || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">With Alt Text</div>
                    </div>
                    <div className="bg-red-50 p-6 rounded-xl text-center border-t-4 border-red-600">
                      <div className="text-4xl font-bold text-red-900 mb-2">{pageImage.withoutAlt || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">Missing Alt Text</div>
                    </div>
                  </div>

                  {pageImage.withoutAlt > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                      <div className="font-bold text-red-900 mb-2">
                        ⚠️ {pageImage.withoutAlt} images are missing alt text
                      </div>
                      <div className="text-sm text-red-800">
                        Alt text is important for accessibility and SEO. Add descriptive alt text to all images.
                      </div>
                    </div>
                  )}

                  {pageImage.issues?.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-bold text-gray-900 mb-3">Image Issues:</h4>
                      <div className="space-y-2">
                        {pageImage.issues.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg">
                            <span className="text-yellow-600 font-bold text-xl mt-0.5">•</span>
                            <span className="text-yellow-900">{issue.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation to next/previous page */}
              <div className="flex justify-between items-center bg-white rounded-xl shadow-md p-6">
                <button
                  onClick={() => {
                    if (selectedPageIndex > 0) {
                      selectPage(selectedPageIndex - 1);
                    }
                  }}
                  disabled={selectedPageIndex === 0}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all ${
                    selectedPageIndex === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  ← Previous Page
                </button>
                <div className="text-gray-700 font-semibold">
                  Page {selectedPageIndex + 1} of {audit.results.discoveredPages.length}
                </div>
                <button
                  onClick={() => {
                    if (selectedPageIndex < audit.results.discoveredPages.length - 1) {
                      selectPage(selectedPageIndex + 1);
                    }
                  }}
                  disabled={selectedPageIndex === audit.results.discoveredPages.length - 1}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all ${
                    selectedPageIndex === audit.results.discoveredPages.length - 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  Next Page →
                </button>
              </div>
            </div>
          );
        })()}

        {/* HIDE ALL OTHER SECTIONS WHEN IN PAGE DETAIL VIEW */}
        {viewMode === 'overview' && (
          <>
        {/* ENHANCED PAGE ANALYSIS WITH SEO OPPORTUNITIES - HIDDEN IN NEW VIEW */}
        {false && audit.results?.pageAnalysis?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div 
              className="flex items-center justify-between cursor-pointer border-b-4 border-orange-500 pb-4 mb-6"
              onClick={() => toggleSection('seoAnalysis')}
            >
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <ExclamationTriangleIcon className="w-8 h-8 mr-3 text-orange-600" />
                SEO Analysis & Opportunities ({audit.results.pageAnalysis.length} Pages Analyzed)
              </h2>
              {collapsedSections.seoAnalysis ? (
                <ChevronDownIcon className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronUpIcon className="w-6 h-6 text-gray-600" />
              )}
            </div>
            {!collapsedSections.seoAnalysis && (
              <div className="space-y-6">
              {audit.results.pageAnalysis.map((analysis, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wide">
                        Analysis {index + 1} of {audit.results.pageAnalysis.length}
                      </div>
                      <a
                        href={analysis.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:underline font-semibold text-base break-all block mb-2"
                      >
                        🔗 {analysis.url}
                      </a>
                    </div>
                    {analysis.seoAnalysis?.seoScore && (
                      <div className="ml-4 flex-shrink-0 bg-white rounded-xl p-4 shadow-md text-center">
                        <div className={`text-4xl font-bold mb-1 ${
                          analysis.seoAnalysis.seoScore >= 80 ? 'text-green-600' :
                          analysis.seoAnalysis.seoScore >= 60 ? 'text-yellow-600' :
                          analysis.seoAnalysis.seoScore >= 40 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {analysis.seoAnalysis.seoScore}
                        </div>
                        <div className="text-xs text-gray-600">SEO Score</div>
                      </div>
                    )}
                  </div>

                  {/* Critical Issues */}
                  {analysis.seoAnalysis?.criticalIssues?.length > 0 && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <h4 className="text-sm font-bold text-red-900 mb-3 flex items-center">
                        🔴 Critical Issues ({analysis.seoAnalysis.criticalIssues.length})
                      </h4>
                      <ul className="space-y-2">
                        {analysis.seoAnalysis.criticalIssues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                            <span className="font-bold mt-0.5">•</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {analysis.seoAnalysis?.opportunities?.length > 0 && (
                    <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                      <h4 className="text-sm font-bold text-yellow-900 mb-3 flex items-center">
                        ⚠️ Improvement Opportunities ({analysis.seoAnalysis.opportunities.length})
                      </h4>
                      <ul className="space-y-2">
                        {analysis.seoAnalysis.opportunities.map((opportunity, idx) => (
                          <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                            <span className="font-bold mt-0.5">•</span>
                            <span>{opportunity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.seoAnalysis?.recommendations?.length > 0 && (
                    <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center">
                        ✅ Good Practices ({analysis.seoAnalysis.recommendations.length})
                      </h4>
                      <ul className="space-y-2">
                        {analysis.seoAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                            <span className="font-bold mt-0.5">✓</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    {analysis.content?.wordCount && (
                      <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">{analysis.content.wordCount}</div>
                        <div className="text-xs text-gray-600">Words</div>
                      </div>
                    )}
                    {analysis.images?.total !== undefined && (
                      <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">{analysis.images.withAlt}/{analysis.images.total}</div>
                        <div className="text-xs text-gray-600">Alt Tags</div>
                      </div>
                    )}
                    {analysis.links?.internal?.count !== undefined && (
                      <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">{analysis.links.internal.count}</div>
                        <div className="text-xs text-gray-600">Internal Links</div>
                      </div>
                    )}
                    {analysis.headings?.h1Count !== undefined && (
                      <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                        <div className={`text-2xl font-bold ${
                          analysis.headings.h1Count === 1 ? 'text-green-600' :
                          analysis.headings.h1Count === 0 ? 'text-red-600' :
                          'text-orange-600'
                        }`}>
                          {analysis.headings.h1Count}
                        </div>
                        <div className="text-xs text-gray-600">H1 Tags</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {/* ALL META TAGS ANALYSIS */}
        {audit.results?.metaAnalysis?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div 
              className="flex items-center justify-between cursor-pointer border-b-4 border-purple-500 pb-4 mb-6"
              onClick={() => toggleSection('metaAnalysis')}
            >
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <InformationCircleIcon className="w-8 h-8 mr-3 text-purple-600" />
                Complete Meta Tags Analysis ({audit.results.metaAnalysis.length} Pages)
              </h2>
              {collapsedSections.metaAnalysis ? (
                <ChevronDownIcon className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronUpIcon className="w-6 h-6 text-gray-600" />
              )}
            </div>
            {!collapsedSections.metaAnalysis && (
              <div className="space-y-6">
              {audit.results.metaAnalysis.map((meta, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl shadow-lg">
                  <div className="text-xs font-bold text-purple-600 mb-2 uppercase tracking-wide">
                    Page {index + 1} of {audit.results.metaAnalysis.length}
                  </div>
                  <div className="text-sm font-semibold text-purple-900 mb-6 break-all">
                    🔗 {meta.url}
                  </div>

                  <div className="space-y-5">
                    {/* Title Analysis */}
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-blue-900 text-base">📌 Title Tag</div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${
                          meta.title?.length >= 30 && meta.title?.length <= 60 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {meta.title?.length || 0} characters
                        </span>
                      </div>
                      <div className="text-base text-gray-900 mb-3 font-semibold">
                        {meta.title?.text || '❌ Missing Title'}
                      </div>
                      {meta.title?.isTooShort && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg mt-2 font-medium">
                          ⚠️ Title is too short (recommended: 30-60 characters)
                        </div>
                      )}
                      {meta.title?.isTooLong && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg mt-2 font-medium">
                          ⚠️ Title is too long and may be truncated in search results
                        </div>
                      )}
                      {!meta.title?.text && (
                        <div className="text-sm text-red-900 bg-red-100 p-3 rounded-lg mt-2 font-medium">
                          🔴 Critical: Missing title tag - essential for SEO
                        </div>
                      )}
                    </div>

                    {/* Description Analysis */}
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-green-900 text-base">📝 Meta Description</div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${
                          meta.description?.length >= 120 && meta.description?.length <= 160 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {meta.description?.length || 0} characters
                        </span>
                      </div>
                      <div className="text-base text-gray-900 mb-3">
                        {meta.description?.text || '❌ Missing Description'}
                      </div>
                      {meta.description?.isTooShort && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg mt-2 font-medium">
                          ⚠️ Description is too short (recommended: 120-160 characters)
                        </div>
                      )}
                      {meta.description?.isTooLong && (
                        <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded-lg mt-2 font-medium">
                          ⚠️ Description is too long and may be truncated in search results
                        </div>
                      )}
                      {!meta.description?.text && (
                        <div className="text-sm text-red-900 bg-red-100 p-3 rounded-lg mt-2 font-medium">
                          🟠 High Priority: Missing meta description - important for click-through rates
                        </div>
                      )}
                    </div>

                    {/* Issues */}
                    {meta.issues?.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {meta.issues.map((issue, issueIdx) => (
                          <span
                            key={issueIdx}
                            className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full shadow-md ${getSeverityClass(issue.severity)}`}
                          >
                            {issue.severity === 'Critical' && '🔴 '}
                            {issue.severity === 'High' && '🟠 '}
                            {issue.severity === 'Medium' && '🟡 '}
                            {issue.severity === 'Low' && '🟢 '}
                            {issue.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {/* ALL IMAGES ANALYSIS */}
        {audit.results?.imageAnalysis?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-yellow-500 pb-4">
              <svg className="w-8 h-8 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Complete Images & Alt Tags Analysis ({audit.results.imageAnalysis.length} Pages)
            </h2>
            <div className="space-y-6">
              {audit.results.imageAnalysis.map((imageData, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl shadow-lg">
                  <div className="text-xs font-bold text-yellow-700 mb-2 uppercase tracking-wide">
                    Page {index + 1} of {audit.results.imageAnalysis.length}
                  </div>
                  <div className="text-sm font-semibold text-yellow-900 mb-6 break-all">
                    🔗 {imageData.url}
                  </div>

                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-xl text-center shadow-md border-t-4 border-gray-500">
                      <div className="text-4xl font-bold text-gray-900 mb-2">{imageData.totalImages}</div>
                      <div className="text-sm text-gray-600 font-semibold">Total Images</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl text-center shadow-md border-t-4 border-green-500">
                      <div className="text-4xl font-bold text-green-600 mb-2">{imageData.imagesWithAlt}</div>
                      <div className="text-sm text-gray-600 font-semibold">✅ With Alt Tags</div>
                      <div className="text-xs text-green-600 mt-1">
                        {imageData.totalImages > 0 ? Math.round((imageData.imagesWithAlt / imageData.totalImages) * 100) : 0}% Complete
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl text-center shadow-md border-t-4 border-red-500">
                      <div className="text-4xl font-bold text-red-600 mb-2">{imageData.imagesWithoutAlt}</div>
                      <div className="text-sm text-gray-600 font-semibold">❌ Without Alt Tags</div>
                      <div className="text-xs text-red-600 mt-1">Need Attention</div>
                    </div>
                  </div>

                  {imageData.images && imageData.images.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                      <div className="font-bold text-gray-900 mb-4 text-lg">
                        All Images on This Page ({imageData.images.length}):
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {imageData.images.map((img, imgIdx) => (
                          <div key={imgIdx} className={`p-4 rounded-lg border-l-4 shadow-sm ${
                            img.hasAlt ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                          }`}>
                            <div className="text-sm font-semibold text-gray-700 mb-2">
                              Image #{imgIdx + 1}
                            </div>
                            <div className="text-xs font-mono text-gray-600 break-all mb-2 bg-gray-100 p-2 rounded">
                              {img.src}
                            </div>
                            <div className="text-sm">
                              {img.hasAlt ? (
                                <div>
                                  <span className="text-green-700 font-semibold">✅ Alt Text:</span>
                                  <div className="mt-1 text-gray-900 bg-green-100 p-2 rounded">
                                    "{img.alt}"
                                  </div>
                                </div>
                              ) : (
                                <div className="text-red-700 font-bold bg-red-100 p-2 rounded">
                                  ❌ Missing Alt Tag - Critical for Accessibility & SEO
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {imageData.issues?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      {imageData.issues.map((issue, issueIdx) => (
                        <span
                          key={issueIdx}
                          className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full shadow-md ${getSeverityClass(issue.severity)}`}
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

        {/* ALL HEADING STRUCTURE */}
        {audit.results?.headingStructure?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-indigo-500 pb-4">
              <svg className="w-8 h-8 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Heading Structure Analysis ({audit.results.headingStructure.length} Pages)
            </h2>
            <div className="space-y-6">
              {audit.results.headingStructure.map((heading, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl shadow-lg">
                  <div className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">
                    Page {index + 1} of {audit.results.headingStructure.length}
                  </div>
                  <div className="text-sm font-semibold text-indigo-900 mb-6 break-all">
                    🔗 {heading.url}
                  </div>

                  <div className="grid grid-cols-6 gap-3 mb-6">
                    <div className="bg-white p-4 rounded-lg text-center shadow-md border-t-4 border-indigo-600">
                      <div className="text-3xl font-bold text-indigo-900 mb-1">{heading.h1Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H1</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center shadow-md border-t-4 border-blue-600">
                      <div className="text-3xl font-bold text-blue-900 mb-1">{heading.h2Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H2</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center shadow-md border-t-4 border-cyan-600">
                      <div className="text-3xl font-bold text-cyan-900 mb-1">{heading.h3Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H3</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center shadow-md border-t-4 border-teal-600">
                      <div className="text-3xl font-bold text-teal-900 mb-1">{heading.h4Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H4</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center shadow-md border-t-4 border-green-600">
                      <div className="text-3xl font-bold text-green-900 mb-1">{heading.h5Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H5</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center shadow-md border-t-4 border-lime-600">
                      <div className="text-3xl font-bold text-lime-900 mb-1">{heading.h6Count || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">H6</div>
                    </div>
                  </div>

                  {heading.headings && heading.headings.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                      <div className="font-bold text-gray-900 mb-4 text-lg">
                        All Headings ({heading.headings.length}):
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {heading.headings.map((h, hIdx) => {
                          // Safely convert level to display format
                          const levelDisplay = typeof h.level === 'number' 
                            ? `H${h.level}` 
                            : (typeof h.level === 'string' && h.level ? h.level.toUpperCase() : 'H?');
                          
                          return (
                            <div key={hIdx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex-shrink-0 ${
                                h.level === 1 || h.level === 'h1' ? 'bg-indigo-600 text-white' :
                                h.level === 2 || h.level === 'h2' ? 'bg-blue-600 text-white' :
                                h.level === 3 || h.level === 'h3' ? 'bg-cyan-600 text-white' :
                                h.level === 4 || h.level === 'h4' ? 'bg-teal-600 text-white' :
                                h.level === 5 || h.level === 'h5' ? 'bg-green-600 text-white' :
                                'bg-lime-600 text-white'
                              }`}>
                                {levelDisplay}
                              </span>
                              <span className="text-sm text-gray-900 font-medium">{h.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {heading.issues?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      {heading.issues.map((issue, issueIdx) => (
                        <span
                          key={issueIdx}
                          className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full shadow-md ${getSeverityClass(issue.severity)}`}
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

        {/* ALL LINKS ANALYSIS */}
        {audit.results?.linksAnalysis?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-green-500 pb-4">
              <svg className="w-8 h-8 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Complete Links Analysis ({audit.results.linksAnalysis.length} Pages)
            </h2>
            <div className="space-y-6">
              {audit.results.linksAnalysis.map((links, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-xl shadow-lg">
                  <div className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">
                    Page {index + 1} of {audit.results.linksAnalysis.length}
                  </div>
                  <div className="text-sm font-semibold text-green-900 mb-6 break-all">
                    🔗 {links.url}
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-xl text-center shadow-md border-t-4 border-gray-500">
                      <div className="text-3xl font-bold text-gray-900 mb-2">{links.totalLinks || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">Total Links</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl text-center shadow-md border-t-4 border-blue-500">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{links.internalLinks || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">🏠 Internal</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl text-center shadow-md border-t-4 border-purple-500">
                      <div className="text-3xl font-bold text-purple-600 mb-2">{links.externalLinks || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">🌐 External</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl text-center shadow-md border-t-4 border-red-500">
                      <div className="text-3xl font-bold text-red-600 mb-2">{links.brokenLinks || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">❌ Broken</div>
                    </div>
                  </div>

                  {links.links && links.links.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                      <div className="font-bold text-gray-900 mb-4 text-lg">
                        All Links ({links.links.length}):
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {links.links.map((link, linkIdx) => (
                          <div key={linkIdx} className={`p-3 rounded-lg border-l-4 ${
                            link.type === 'internal' ? 'bg-blue-50 border-blue-500' : 'bg-purple-50 border-purple-500'
                          }`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="text-xs font-mono text-gray-600 break-all mb-1">
                                  {link.href}
                                </div>
                                <div className="text-sm text-gray-900">
                                  {link.text || '(No anchor text)'}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${
                                link.type === 'internal' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                              }`}>
                                {link.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {links.issues?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      {links.issues.map((issue, issueIdx) => (
                        <span
                          key={issueIdx}
                          className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full shadow-md ${getSeverityClass(issue.severity)}`}
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

        {/* CONTENT ANALYSIS */}
        {audit.results?.contentAnalysis?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-pink-500 pb-4">
              <svg className="w-8 h-8 mr-3 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Content Quality Analysis ({audit.results.contentAnalysis.length} Pages)
            </h2>
            <div className="space-y-6">
              {audit.results.contentAnalysis.map((content, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-xl shadow-lg">
                  <div className="text-xs font-bold text-pink-600 mb-2 uppercase tracking-wide">
                    Page {index + 1} of {audit.results.contentAnalysis.length}
                  </div>
                  <div className="text-sm font-semibold text-pink-900 mb-6 break-all">
                    🔗 {content.url}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-xl text-center shadow-md">
                      <div className="text-3xl font-bold text-gray-900 mb-2">{content.wordCount || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">Word Count</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl text-center shadow-md">
                      <div className="text-3xl font-bold text-gray-900 mb-2">{content.paragraphs || 0}</div>
                      <div className="text-sm text-gray-600 font-semibold">Paragraphs</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl text-center shadow-md">
                      <div className="text-3xl font-bold text-gray-900 mb-2">{content.readabilityScore || 'N/A'}</div>
                      <div className="text-sm text-gray-600 font-semibold">Readability</div>
                    </div>
                  </div>

                  {content.issues?.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {content.issues.map((issue, issueIdx) => (
                        <span
                          key={issueIdx}
                          className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full shadow-md ${getSeverityClass(issue.severity)}`}
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

        {/* ALL PAGES SUMMARY TABLE */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-indigo-500 pb-4">
            <svg className="w-8 h-8 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Complete Pages Summary Table
          </h2>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{audit.results?.discoveredPages?.length || 0}</div>
              <div className="text-sm text-gray-600">Pages Discovered</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{audit.results?.pageAnalysis?.length || 0}</div>
              <div className="text-sm text-gray-600">Pages Analyzed</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {audit.results?.pageAnalysis?.filter(p => p.seoAnalysis?.seoScore >= 70).length || 0}
              </div>
              <div className="text-sm text-gray-600">Good SEO Scores</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {audit.results?.pageAnalysis?.reduce((sum, p) => sum + (p.seoAnalysis?.criticalIssues?.length || 0), 0) || 0}
              </div>
              <div className="text-sm text-gray-600">Total Critical Issues</div>
            </div>
          </div>

          {/* Pages Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                    Page URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                    Title
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                    SEO Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                    Words
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r">
                    Images
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {audit.results?.pageAnalysis?.map((page, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-600 border-r">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm border-r">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium break-all"
                      >
                        {page.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r max-w-xs">
                      <div className="truncate" title={page.metaData?.title?.text || 'No Title'}>
                        {page.metaData?.title?.text || '⚠️ No Title'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        page.statusCode === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {page.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      {page.seoAnalysis?.seoScore ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          page.seoAnalysis.seoScore >= 80 ? 'bg-green-100 text-green-800' :
                          page.seoAnalysis.seoScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          page.seoAnalysis.seoScore >= 40 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {page.seoAnalysis.seoScore}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r">
                      {page.content?.wordCount || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm border-r">
                      {page.images?.total > 0 ? (
                        <span className={`${
                          page.images.withoutAlt > 0 ? 'text-orange-600 font-semibold' : 'text-green-600'
                        }`}>
                          {page.images.withAlt}/{page.images.total}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {page.seoAnalysis?.criticalIssues?.length > 0 && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">
                            🔴 {page.seoAnalysis.criticalIssues.length}
                          </span>
                        )}
                        {page.seoAnalysis?.opportunities?.length > 0 && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">
                            ⚠️ {page.seoAnalysis.opportunities.length}
                          </span>
                        )}
                        {(!page.seoAnalysis?.criticalIssues?.length && !page.seoAnalysis?.opportunities?.length) && (
                          <span className="text-green-600 text-sm">✓</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* If no pageAnalysis, show discovered pages */}
                {(!audit.results?.pageAnalysis || audit.results.pageAnalysis.length === 0) && 
                 audit.results?.discoveredPages?.map((page, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-600 border-r">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm border-r">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium break-all"
                      >
                        {page.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r max-w-xs">
                      <div className="truncate" title={page.title || 'No Title'}>
                        {page.title || '⚠️ No Title'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        page.statusCode === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {page.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      <span className="text-gray-400">-</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r">
                      {page.wordCount || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm border-r">
                      <span className="text-gray-400">-</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {page.issues && page.issues.length > 0 ? (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                          {page.issues.length}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {(!audit.results?.pageAnalysis || audit.results.pageAnalysis.length === 0) &&
                 (!audit.results?.discoveredPages || audit.results.discoveredPages.length === 0) && (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      No pages found in this audit
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-bold text-gray-700 mb-3">📖 Table Legend:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="font-semibold">SEO Score:</span>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span>80-100: Excellent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                    <span>60-79: Good</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded"></span>
                    <span>40-59: Fair</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    <span>0-39: Poor</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="font-semibold">Status Code:</span>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span>200: Success</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    <span>Other: Error</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="font-semibold">Images:</span>
                <div className="mt-1">
                  <span className="text-gray-600">Shows: With Alt / Total</span>
                </div>
              </div>
              <div>
                <span className="font-semibold">Issues:</span>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">🔴</span>
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <span>Opportunities</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </Layout>
  )
}
