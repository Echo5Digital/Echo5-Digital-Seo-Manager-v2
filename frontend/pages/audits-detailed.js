import { useEffect, useState, useMemo } from 'react'
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

/**
 * Audit Detailed Page - Displays comprehensive SEO audit results
 * @returns {JSX.Element}
 */
export default function AuditDetailed() {
  const router = useRouter()
  const { id } = router.query
  
  const getAuditDetails = useAuditStore(state => state.getAuditDetails)
  const clients = useClientStore(state => state.clients)
  const fetchClients = useClientStore(state => state.fetchClients)
  
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPageIndex, setSelectedPageIndex] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'issues', 'meta', 'headings', 'images'
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [sortBy, setSortBy] = useState('index')
  const [expandedIssues, setExpandedIssues] = useState({})
  const [openIssuesDropdown, setOpenIssuesDropdown] = useState(null)

  const toggleIssue = (id) => {
    setExpandedIssues(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const selectPage = (index) => {
    setSelectedPageIndex(index)
    setActiveTab('overview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const backToOverview = () => {
    setSelectedPageIndex(null)
    setActiveTab('overview')
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

  // URL matching helpers to robustly associate analysis/meta/etc with discovered pages
  const normalizeUrl = (value) => {
    try {
      if (!value) return '/'
      const str = String(value).trim()
      const urlObj = new URL(/^https?:\/\//i.test(str) ? str : `https://${str}`)
      const host = (urlObj.hostname || '').toLowerCase().replace(/^www\./, '')
      const path = (urlObj.pathname || '/').replace(/\/+$/,'') || '/'
      return `${host}${path}`
    } catch {
      const s = String(value || '').split('?')[0].split('#')[0]
      return (s || '/').replace(/\/+$/,'') || '/'
    }
  }

  const makeLookup = (arr) => {
    const map = new Map()
    ;(arr || []).forEach(item => {
      if (item && item.url) map.set(normalizeUrl(item.url), item)
    })
    return map
  }

  const lookups = useMemo(() => ({
    analysisMap: makeLookup(audit?.results?.pageAnalysis),
    metaMap: makeLookup(audit?.results?.metaAnalysis),
    headingsMap: makeLookup(audit?.results?.headingStructure),
    imagesMap: makeLookup(audit?.results?.imageAnalysis),
  }), [audit])

  const getFromMap = (map, url, fallbackArr) => {
    if (!url || !map) return undefined
    const key = normalizeUrl(url)
    if (map.has(key)) return map.get(key)
    // Fallback by path if host/protocol differs
    const targetPath = (() => {
      try {
        const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
        return (u.pathname || '/').replace(/\/+$/,'') || '/'
      } catch {
        const s = String(url || '').split('?')[0].split('#')[0]
        return (s || '/').replace(/\/+$/,'') || '/'
      }
    })()
    return (fallbackArr || []).find(it => {
      const k = normalizeUrl(it?.url)
      const idx = k.indexOf('/')
      const path = idx >= 0 ? k.substring(idx) : '/'
      return path === targetPath
    })
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

  // Compute heading counts if explicit hNCount fields are missing
  const getHeadingCount = (headingsData, level) => {
    if (!headingsData) return 0
    const direct = headingsData[`h${level}Count`]
    if (typeof direct === 'number') return direct
    const arr = Array.isArray(headingsData.headings) ? headingsData.headings : []
    return arr.reduce((acc, h) => {
      let l = h?.level
      if (typeof l === 'string') {
        const m = l.toLowerCase().match(/^h(\d)$/)
        if (m) l = parseInt(m[1], 10)
      }
      return acc + (l === level ? 1 : 0)
    }, 0)
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
            <span className="text-sm text-gray-600 font-medium">Export:</span>
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
            💡 Professional SEO audit powered by advanced crawling technology
          </div>
        </div>

        {/* MAIN CONTENT - Ahrefs-style Interface */}
        {selectedPageIndex === null ? (
          /* ============ ALL PAGES VIEW ============ */
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Search and Filters Bar */}
            <div className="bg-gray-50 border-b-2 border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="🔍 Search by URL or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white font-medium"
                >
                  <option value="all">All Pages ({audit.results?.discoveredPages?.length || 0})</option>
                  <option value="critical">Critical Issues Only</option>
                  <option value="opportunities">Has Opportunities</option>
                  <option value="good">Good Score (80+)</option>
                  <option value="needs-work">Needs Work (&lt;60)</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white font-medium"
                >
                  <option value="index">Page Order</option>
                  <option value="score-desc">Highest Score First</option>
                  <option value="score-asc">Lowest Score First</option>
                  <option value="issues-desc">Most Issues First</option>
                </select>
              </div>
            </div>

            {/* Pages Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-700 to-gray-800 text-white text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">URL</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-center font-semibold">Score</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Issues</th>
                    <th className="px-4 py-3 text-center font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let pages = audit.results?.discoveredPages?.map((page, index) => ({
                      ...page,
                      originalIndex: index,
                      analysis: getFromMap(lookups.analysisMap, page.url, audit.results?.pageAnalysis),
                    })) || [];

                    // Filter
                    if (searchTerm) {
                      pages = pages.filter(p => 
                        p.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    }

                    if (filterBy === 'critical') pages = pages.filter(p => (p.analysis?.seoAnalysis?.criticalIssues?.length || 0) > 0);
                    else if (filterBy === 'opportunities') pages = pages.filter(p => (p.analysis?.seoAnalysis?.opportunities?.length || 0) > 0);
                    else if (filterBy === 'good') pages = pages.filter(p => (p.analysis?.seoAnalysis?.seoScore || 0) >= 80);
                    else if (filterBy === 'needs-work') pages = pages.filter(p => (p.analysis?.seoAnalysis?.seoScore || 0) < 60);

                    // Sort
                    if (sortBy === 'score-desc') pages.sort((a, b) => (b.analysis?.seoAnalysis?.seoScore || 0) - (a.analysis?.seoAnalysis?.seoScore || 0));
                    else if (sortBy === 'score-asc') pages.sort((a, b) => (a.analysis?.seoAnalysis?.seoScore || 0) - (b.analysis?.seoAnalysis?.seoScore || 0));
                    else if (sortBy === 'issues-desc') {
                      pages.sort((a, b) => {
                        const aIssues = (a.analysis?.seoAnalysis?.criticalIssues?.length || 0) + (a.analysis?.seoAnalysis?.opportunities?.length || 0);
                        const bIssues = (b.analysis?.seoAnalysis?.criticalIssues?.length || 0) + (b.analysis?.seoAnalysis?.opportunities?.length || 0);
                        return bIssues - aIssues;
                      });
                    }

                    if (pages.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                            <div className="text-5xl mb-3">🔍</div>
                            <div className="font-semibold text-lg">No pages found</div>
                            <button onClick={() => { setSearchTerm(''); setFilterBy('all'); }} className="mt-3 text-blue-600 hover:underline">Clear filters</button>
                          </td>
                        </tr>
                      );
                    }

                    return pages.map((page, idx) => {
                      const score = page.analysis?.seoAnalysis?.seoScore;
                      const critical = page.analysis?.seoAnalysis?.criticalIssues?.length || 0;
                      const opportunities = page.analysis?.seoAnalysis?.opportunities?.length || 0;
                      
                      return (
                        <tr 
                          key={page.originalIndex}
                          className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => selectPage(page.originalIndex)}
                        >
                          <td className="px-4 py-3 text-gray-700 font-semibold">{page.originalIndex + 1}</td>
                          <td className="px-4 py-3">
                            <div className="text-blue-600 text-sm font-medium max-w-md truncate" title={page.url}>{page.url}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900 text-sm font-medium max-w-xs truncate" title={page.title}>
                              {page.title || <span className="text-gray-400 italic">No title</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {score ? (
                              <div className="flex flex-col items-center">
                                <span className={`text-2xl font-bold ${
                                  score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : score >= 40 ? 'text-orange-600' : 'text-red-600'
                                }`}>{score}</span>
                                <span className="text-xs text-gray-500">/100</span>
                              </div>
                            ) : <span className="text-gray-400">N/A</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                              page.statusCode === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>{page.statusCode}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(() => {
                              const totalIssues = critical + opportunities;
                              if (totalIssues === 0) {
                                return (
                                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded font-bold">Clean</span>
                                );
                              }
                              return (
                                <div
                                  className="relative inline-block text-left"
                                  onMouseLeave={() => setOpenIssuesDropdown(null)}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold rounded bg-red-600 text-white hover:bg-red-700 shadow-sm"
                                    onMouseEnter={() => setOpenIssuesDropdown(page.originalIndex)}
                                    onClick={() => setOpenIssuesDropdown(openIssuesDropdown === page.originalIndex ? null : page.originalIndex)}
                                  >
                                    {totalIssues} Issues
                                    <span className="text-white/90">▾</span>
                                  </button>
                                  {openIssuesDropdown === page.originalIndex && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-20 text-left" onClick={(e) => e.stopPropagation()}>
                                      <div className="p-3 border-b font-semibold text-gray-800">Issues for this page</div>
                                      <div className="max-h-64 overflow-auto p-3 space-y-3">
                                        {critical > 0 && (
                                          <div>
                                            <div className="text-sm font-bold text-red-700 mb-1">🔴 Critical Issues ({critical})</div>
                                            <ul className="space-y-1 text-sm">
                                              {(page.analysis?.seoAnalysis?.criticalIssues || []).map((issue, i) => (
                                                <li key={`c-${i}`} className="flex items-start gap-2">
                                                  <span className="text-red-600 font-bold">•</span>
                                                  <span className="text-gray-800">{issue}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {opportunities > 0 && (
                                          <div>
                                            <div className="text-sm font-bold text-yellow-700 mb-1">⚠️ Opportunities ({opportunities})</div>
                                            <ul className="space-y-1 text-sm">
                                              {(page.analysis?.seoAnalysis?.opportunities || []).map((opp, i) => (
                                                <li key={`o-${i}`} className="flex items-start gap-2">
                                                  <span className="text-yellow-600 font-bold">•</span>
                                                  <span className="text-gray-800">{opp}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-2 border-t bg-gray-50 text-right">
                                        <button
                                          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1"
                                          onClick={() => setOpenIssuesDropdown(null)}
                                        >
                                          Close
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={(e) => { e.stopPropagation(); selectPage(page.originalIndex); }}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ============ SINGLE PAGE DETAIL VIEW ============ */
          (() => {
            const page = audit.results?.discoveredPages[selectedPageIndex];
            const analysis = getFromMap(lookups.analysisMap, page?.url, audit.results?.pageAnalysis);
            const meta = getFromMap(lookups.metaMap, page?.url, audit.results?.metaAnalysis);
            const headings = getFromMap(lookups.headingsMap, page?.url, audit.results?.headingStructure);
            const images = getFromMap(lookups.imagesMap, page?.url, audit.results?.imageAnalysis);

            if (!page) return null;

            return (
              <div className="space-y-6">
                {/* Back Button & Page Header */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <button
                    onClick={backToOverview}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold mb-4 transition-colors"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to All Pages
                  </button>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-2">
                        Page {selectedPageIndex + 1} of {audit.results?.discoveredPages?.length}
                      </div>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xl font-bold text-blue-600 hover:underline block mb-3"
                      >
                        {page.url}
                      </a>
                      <div className="text-gray-900 font-semibold mb-1">
                        {page.title || <span className="text-gray-400 italic">No title found</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {page.metaDescription || <span className="text-gray-400 italic">No meta description</span>}
                      </div>
                    </div>
                    
                    {analysis?.seoAnalysis?.seoScore && (
                      <div className="ml-6 bg-gray-100 rounded-xl p-6 text-center">
                        <div className={`text-5xl font-black mb-1 ${
                          analysis.seoAnalysis.seoScore >= 80 ? 'text-green-600' :
                          analysis.seoAnalysis.seoScore >= 60 ? 'text-yellow-600' :
                          analysis.seoAnalysis.seoScore >= 40 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {analysis.seoAnalysis.seoScore}
                        </div>
                        <div className="text-sm text-gray-600 font-semibold">SEO Score</div>
                      </div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-5 gap-4 mt-6">
                    <div className="bg-gray-50 p-3 rounded text-center">
                      <div className="text-2xl font-bold text-gray-900">{formatBytes(page.contentLength)}</div>
                      <div className="text-xs text-gray-600">Page Size</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded text-center">
                      <div className="text-2xl font-bold text-gray-900">{analysis?.content?.wordCount || 'N/A'}</div>
                      <div className="text-xs text-gray-600">Words</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded text-center">
                      <div className="text-2xl font-bold text-gray-900">{images?.totalImages || 0}</div>
                      <div className="text-xs text-gray-600">Images</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded text-center">
                      <div className="text-2xl font-bold text-gray-900">{headings?.headings?.length || 0}</div>
                      <div className="text-xs text-gray-600">Headings</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded text-center">
                      <div className={`text-2xl font-bold ${
                        (analysis?.seoAnalysis?.criticalIssues?.length || 0) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {(analysis?.seoAnalysis?.criticalIssues?.length || 0) + (analysis?.seoAnalysis?.opportunities?.length || 0)}
                      </div>
                      <div className="text-xs text-gray-600">Issues</div>
                    </div>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="flex border-b">
                    {[
                      { id: 'overview', label: 'Overview', count: null },
                      { id: 'issues', label: 'Issues', count: (analysis?.seoAnalysis?.criticalIssues?.length || 0) + (analysis?.seoAnalysis?.opportunities?.length || 0) },
                      { id: 'meta', label: 'Meta Tags', count: null },
                      { id: 'headings', label: 'Headings', count: headings?.headings?.length || 0 },
                      { id: 'images', label: 'Images', count: images?.totalImages || 0 },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-4 py-3 font-semibold text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                            activeTab === tab.id ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                            <h3 className="font-bold text-gray-900 mb-3">Page Information</h3>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-semibold">URL:</span> <span className="text-gray-700">{page.url}</span></div>
                              <div><span className="font-semibold">Status:</span> <span className={page.statusCode === 200 ? 'text-green-600' : 'text-red-600'}>{page.statusCode}</span></div>
                              <div><span className="font-semibold">Content Type:</span> <span className="text-gray-700">{page.contentType || 'N/A'}</span></div>
                              <div><span className="font-semibold">Load Time:</span> <span className="text-gray-700">{page.loadTime || 'N/A'}</span></div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                            <h3 className="font-bold text-gray-900 mb-3">SEO Summary</h3>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-semibold">Score:</span> <span className="text-gray-700">{analysis?.seoAnalysis?.seoScore || 'N/A'}/100</span></div>
                              <div><span className="font-semibold">Critical Issues:</span> <span className="text-red-600 font-bold">{analysis?.seoAnalysis?.criticalIssues?.length || 0}</span></div>
                              <div><span className="font-semibold">Opportunities:</span> <span className="text-yellow-600 font-bold">{analysis?.seoAnalysis?.opportunities?.length || 0}</span></div>
                              <div><span className="font-semibold">Good Practices:</span> <span className="text-green-600 font-bold">{analysis?.seoAnalysis?.recommendations?.length || 0}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Issues Tab */}
                    {activeTab === 'issues' && (
                      <div className="space-y-4">
                        {(!analysis?.seoAnalysis?.criticalIssues?.length && !analysis?.seoAnalysis?.opportunities?.length) ? (
                          <div className="text-center py-12">
                            <div className="text-6xl mb-3">🎉</div>
                            <div className="text-xl font-bold text-gray-700">No issues found!</div>
                            <div className="text-gray-500">This page looks great.</div>
                          </div>
                        ) : (
                          <>
                            {analysis?.seoAnalysis?.criticalIssues?.length > 0 && (
                              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
                                <h4 className="font-bold text-red-900 mb-4 text-lg">🔴 Critical Issues ({analysis.seoAnalysis.criticalIssues.length})</h4>
                                <ul className="space-y-3">
                                  {analysis.seoAnalysis.criticalIssues.map((issue, idx) => (
                                    <li key={idx} className="flex gap-3 bg-white p-4 rounded shadow-sm">
                                      <span className="font-bold text-red-600">#{idx + 1}</span>
                                      <span className="text-gray-900">{issue}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {analysis?.seoAnalysis?.opportunities?.length > 0 && (
                              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
                                <h4 className="font-bold text-yellow-900 mb-4 text-lg">⚠️ Opportunities ({analysis.seoAnalysis.opportunities.length})</h4>
                                <ul className="space-y-3">
                                  {analysis.seoAnalysis.opportunities.map((opp, idx) => (
                                    <li key={idx} className="flex gap-3 bg-white p-4 rounded shadow-sm">
                                      <span className="font-bold text-yellow-600">#{idx + 1}</span>
                                      <span className="text-gray-900">{opp}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {analysis?.seoAnalysis?.recommendations?.length > 0 && (
                              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                                <h4 className="font-bold text-green-900 mb-4 text-lg">✅ Good Practices ({analysis.seoAnalysis.recommendations.length})</h4>
                                <ul className="space-y-3">
                                  {analysis.seoAnalysis.recommendations.map((rec, idx) => (
                                    <li key={idx} className="flex gap-3 bg-white p-4 rounded shadow-sm">
                                      <span className="font-bold text-green-600">✓</span>
                                      <span className="text-gray-900">{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Meta Tags Tab */}
                    {activeTab === 'meta' && (
                      <div className="space-y-6">
                        {/* Title */}
                        <div className="bg-blue-50 p-6 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-blue-900">Title Tag</h4>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              (meta?.title?.text?.length || 0) >= 30 && (meta?.title?.text?.length || 0) <= 60
                                ? 'bg-green-500 text-white'
                                : 'bg-orange-500 text-white'
                            }`}>
                              {meta?.title?.text?.length || page.title?.length || 0} chars
                            </span>
                          </div>
                          <div className="bg-white p-4 rounded mb-3 text-gray-900">
                            {meta?.title?.text || page.title || <span className="text-gray-400 italic">No title tag found</span>}
                          </div>
                          {meta?.title?.isTooShort && (
                            <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded">
                              ⚠️ Title is too short (recommended: 30-60 characters)
                            </div>
                          )}
                          {meta?.title?.isTooLong && (
                            <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded">
                              ⚠️ Title is too long and may be truncated
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div className="bg-green-50 p-6 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-green-900">Meta Description</h4>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              (meta?.description?.text?.length || 0) >= 120 && (meta?.description?.text?.length || 0) <= 160
                                ? 'bg-green-500 text-white'
                                : 'bg-orange-500 text-white'
                            }`}>
                              {meta?.description?.text?.length || page.metaDescription?.length || 0} chars
                            </span>
                          </div>
                          <div className="bg-white p-4 rounded mb-3 text-gray-900">
                            {meta?.description?.text || page.metaDescription || <span className="text-gray-400 italic">No meta description found</span>}
                          </div>
                          {meta?.description?.isTooShort && (
                            <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded">
                              ⚠️ Description is too short (recommended: 120-160 characters)
                            </div>
                          )}
                          {meta?.description?.isTooLong && (
                            <div className="text-sm text-orange-900 bg-orange-100 p-3 rounded">
                              ⚠️ Description is too long and may be truncated
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Headings Tab */}
                    {activeTab === 'headings' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-6 gap-4">
                          {[1, 2, 3, 4, 5, 6].map(level => (
                            <div key={level} className="bg-gray-50 p-4 rounded text-center">
                              <div className="text-3xl font-bold text-gray-900">
                                {getHeadingCount(headings, level)}
                              </div>
                              <div className="text-xs text-gray-600 font-semibold">H{level}</div>
                            </div>
                          ))}
                        </div>

                        {headings?.headings && headings.headings.length > 0 ? (
                          <div className="bg-gray-50 p-6 rounded">
                            <h4 className="font-bold text-gray-900 mb-4">All Headings ({headings.headings.length})</h4>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {headings.headings.map((h, idx) => {
                                const levelDisplay = typeof h.level === 'number' ? `H${h.level}` : (h.level || 'H?').toUpperCase();
                                return (
                                  <div key={idx} className="flex gap-3 bg-white p-3 rounded shadow-sm">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                      h.level === 1 || h.level === 'h1' ? 'bg-indigo-600 text-white' :
                                      h.level === 2 || h.level === 'h2' ? 'bg-blue-600 text-white' :
                                      h.level === 3 || h.level === 'h3' ? 'bg-cyan-600 text-white' :
                                      h.level === 4 || h.level === 'h4' ? 'bg-teal-600 text-white' :
                                      h.level === 5 || h.level === 'h5' ? 'bg-green-600 text-white' :
                                      'bg-lime-600 text-white'
                                    }`}>
                                      {levelDisplay}
                                    </span>
                                    <span className="text-gray-900">{h.text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">No headings found</div>
                        )}
                      </div>
                    )}

                    {/* Images Tab */}
                    {activeTab === 'images' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                          <div className="bg-blue-50 p-6 rounded text-center">
                            <div className="text-4xl font-bold text-blue-900">{images?.totalImages || 0}</div>
                            <div className="text-sm text-gray-600">Total Images</div>
                          </div>
                          <div className="bg-green-50 p-6 rounded text-center">
                            <div className="text-4xl font-bold text-green-900">{images?.withAlt || 0}</div>
                            <div className="text-sm text-gray-600">With Alt Text</div>
                          </div>
                          <div className="bg-red-50 p-6 rounded text-center">
                            <div className="text-4xl font-bold text-red-900">{images?.withoutAlt || 0}</div>
                            <div className="text-sm text-gray-600">Missing Alt</div>
                          </div>
                        </div>

                        {(images?.withoutAlt || 0) > 0 && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
                            <h4 className="font-bold text-red-900 mb-2">⚠️ {images.withoutAlt} images missing alt text</h4>
                            <p className="text-red-800 text-sm">Alt text is crucial for accessibility and SEO. Add descriptive alt attributes to all images.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between bg-white rounded-xl shadow-lg p-6">
                  <button
                    onClick={() => selectedPageIndex > 0 && selectPage(selectedPageIndex - 1)}
                    disabled={selectedPageIndex === 0}
                    className={`px-6 py-3 rounded font-semibold ${
                      selectedPageIndex === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    ← Previous
                  </button>
                  <div className="text-gray-600 font-semibold">
                    Page {selectedPageIndex + 1} / {audit.results?.discoveredPages?.length}
                  </div>
                  <button
                    onClick={() => selectedPageIndex < (audit.results?.discoveredPages?.length - 1) && selectPage(selectedPageIndex + 1)}
                    disabled={selectedPageIndex >= (audit.results?.discoveredPages?.length - 1)}
                    className={`px-6 py-3 rounded font-semibold ${
                      selectedPageIndex >= (audit.results?.discoveredPages?.length - 1)
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Next →
                  </button>
                </div>
              </div>
            );
          })()
        )}

        {/* AI Analysis - Only show in overview */}
        {selectedPageIndex === null && audit.aiAnalysis && (
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
                {/* Issues Summary */}
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
      </div>
    </Layout>
  )
}

