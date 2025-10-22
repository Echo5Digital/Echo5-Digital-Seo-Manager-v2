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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function AuditDetailed() {
  const router = useRouter()
  const { id } = router.query
  
  const getAuditDetails = useAuditStore(state => state.getAuditDetails)
  const clients = useClientStore(state => state.clients)
  const fetchClients = useClientStore(state => state.fetchClients)
  
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/audits')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Audits
          </button>
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
            className="btn btn-primary"
          >
            📥 Download Full Report (JSON)
          </button>
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

        {/* ALL DISCOVERED PAGES */}
        {audit.results?.discoveredPages?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-blue-500 pb-4">
              <DocumentMagnifyingGlassIcon className="w-8 h-8 mr-3 text-blue-600" />
              All Discovered Pages ({audit.results.discoveredPages.length})
            </h2>
            <div className="space-y-4">
              {audit.results.discoveredPages.map((page, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">
                        Page {index + 1} of {audit.results.discoveredPages.length}
                      </div>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold text-base break-all block mb-2"
                      >
                        🔗 {page.url}
                      </a>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold shadow-sm ${
                        page.statusCode === 200 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {page.statusCode}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-lg font-bold text-gray-900 mb-2">
                      📄 {page.title || '⚠️ No Title'}
                    </div>
                    <div className="text-sm text-gray-700">
                      📝 {page.metaDescription || '⚠️ No Meta Description'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm bg-white p-4 rounded-lg shadow-inner">
                    <div>
                      <span className="font-semibold text-gray-600">Size:</span>
                      <span className="ml-2 text-gray-900 font-medium">{formatBytes(page.contentLength)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Type:</span>
                      <span className="ml-2 text-gray-900 font-medium">{page.contentType || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Discovered:</span>
                      <span className="ml-2 text-gray-900 font-medium">{formatDate(page.discoveredAt)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Load Time:</span>
                      <span className="ml-2 text-gray-900 font-medium">{page.loadTime || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENHANCED PAGE ANALYSIS WITH SEO OPPORTUNITIES */}
        {audit.results?.pageAnalysis?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-orange-500 pb-4">
              <ExclamationTriangleIcon className="w-8 h-8 mr-3 text-orange-600" />
              SEO Analysis & Opportunities ({audit.results.pageAnalysis.length} Pages Analyzed)
            </h2>
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
          </div>
        )}

        {/* ALL META TAGS ANALYSIS */}
        {audit.results?.metaAnalysis?.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center border-b-4 border-purple-500 pb-4">
              <InformationCircleIcon className="w-8 h-8 mr-3 text-purple-600" />
              Complete Meta Tags Analysis ({audit.results.metaAnalysis.length} Pages)
            </h2>
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
                        {heading.headings.map((h, hIdx) => (
                          <div key={hIdx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex-shrink-0 ${
                              h.level === 'h1' ? 'bg-indigo-600 text-white' :
                              h.level === 'h2' ? 'bg-blue-600 text-white' :
                              h.level === 'h3' ? 'bg-cyan-600 text-white' :
                              h.level === 'h4' ? 'bg-teal-600 text-white' :
                              h.level === 'h5' ? 'bg-green-600 text-white' :
                              'bg-lime-600 text-white'
                            }`}>
                              {h.level.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-900 font-medium">{h.text}</span>
                          </div>
                        ))}
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
      </div>
    </Layout>
  )
}
