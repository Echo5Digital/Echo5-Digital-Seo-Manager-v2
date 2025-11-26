import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import useClientStore from '../store/clients'
import useAuditStore from '../store/audits'
import useAuthStore from '../store/auth'
import usePagesStore from '../store/pages'
import useKeywordStore from '../store/keywords'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  LinkIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

export default function Pages() {
  const { clients, fetchClients } = useClientStore()
  const { pages, fetchPages, fetchPage, updateFocusKeyword, refreshContent, recrawlPage, checkSEO, refreshAllSEOScores, error, loading } = usePagesStore()
  const { runAudit, auditProgress } = useAuditStore()
  const { keywords, fetchKeywords } = useKeywordStore()
  const [syncing, setSyncing] = useState(false)
  const [recrawling, setRecrawling] = useState({})
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [clientId, setClientId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')

  useEffect(() => { fetchClients() }, [fetchClients])
  useEffect(() => { fetchKeywords() }, [fetchKeywords])
  useEffect(() => { if (clientId) fetchPages(clientId) }, [clientId, fetchPages])

  // Filter pages
  const mainPages = useMemo(() => {
    let filtered = pages || [];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.url?.toLowerCase().includes(term) || 
        p.title?.toLowerCase().includes(term) ||
        p.seo?.focusKeyword?.toLowerCase().includes(term)
      )
    }
    
    // Score filter
    if (scoreFilter !== 'all') {
      filtered = filtered.filter(p => {
        const score = p.seo?.seoScore || 0
        switch (scoreFilter) {
          case 'excellent': return score >= 80
          case 'good': return score >= 60 && score < 80
          case 'needs-work': return score >= 40 && score < 60
          case 'poor': return score < 40
          default: return true
        }
      })
    }
    
    return filtered;
  }, [pages, searchTerm, scoreFilter]);

  const selectedPage = useMemo(() => pages.find(p => p._id === selectedId), [pages, selectedId])
  
  // Stats
  const stats = useMemo(() => {
    const total = pages?.length || 0
    const excellent = pages?.filter(p => (p.seo?.seoScore || 0) >= 80).length || 0
    const needsWork = pages?.filter(p => (p.seo?.seoScore || 0) < 60).length || 0
    const avgScore = total > 0 ? Math.round(pages.reduce((sum, p) => sum + (p.seo?.seoScore || 0), 0) / total) : 0
    return { total, excellent, needsWork, avgScore }
  }, [pages])
  
  // Export SEO report as PDF
  const exportToPDF = async (page) => {
    try {
      const seoReport = await checkSEO(page._id)
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>SEO Report - ${page.title || page.url}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1f2937; line-height: 1.6; }
            h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; font-size: 28px; }
            h2 { color: #1e3a8a; margin-top: 32px; font-size: 20px; }
            .score { font-size: 64px; font-weight: bold; text-align: center; margin: 24px 0; }
            .score.excellent { color: #16a34a; }
            .score.good { color: #ca8a04; }
            .score.poor { color: #dc2626; }
            .meta { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 12px; margin: 20px 0; }
            .meta-item { margin: 10px 0; font-size: 14px; }
            .meta-label { font-weight: 600; color: #374151; }
            .issue { padding: 14px; margin: 12px 0; border-radius: 8px; border-left: 4px solid; }
            .issue.critical { border-color: #dc2626; background: #fef2f2; }
            .issue.high { border-color: #ea580c; background: #fff7ed; }
            .issue.medium { border-color: #ca8a04; background: #fefce8; }
            .check { padding: 14px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #16a34a; background: #f0fdf4; }
            .recommendation { padding: 14px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #3b82f6; background: #eff6ff; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
            .stat { background: #f9fafb; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e5e7eb; }
            .stat-value { font-size: 28px; font-weight: bold; color: #1e40af; }
            .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .footer { margin-top: 48px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>🔍 SEO Analysis Report</h1>
          
          <div class="meta">
            <div class="meta-item"><span class="meta-label">Page:</span> ${page.title || 'Untitled'}</div>
            <div class="meta-item"><span class="meta-label">URL:</span> ${page.url}</div>
            <div class="meta-item"><span class="meta-label">Focus Keyword:</span> ${page.seo?.focusKeyword || 'Not set'}</div>
            <div class="meta-item"><span class="meta-label">Generated:</span> ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</div>
          </div>

          <h2>Overall Score</h2>
          <div class="score ${(seoReport.data?.seoReport?.score || 0) >= 80 ? 'excellent' : (seoReport.data?.seoReport?.score || 0) >= 60 ? 'good' : 'poor'}">
            ${seoReport.data?.seoReport?.score || 0}<span style="font-size: 24px; color: #9ca3af">/100</span>
          </div>

          <div class="stats">
            <div class="stat"><div class="stat-value">${page.content?.wordCount || 0}</div><div class="stat-label">Words</div></div>
            <div class="stat"><div class="stat-value">${page.content?.links?.internal || 0}</div><div class="stat-label">Internal Links</div></div>
            <div class="stat"><div class="stat-value">${Array.isArray(page.images) ? page.images.length : 0}</div><div class="stat-label">Images</div></div>
          </div>

          ${seoReport.data?.seoReport?.issues?.length > 0 ? `
          <h2>⚠️ Issues (${seoReport.data.seoReport.issues.length})</h2>
          ${seoReport.data.seoReport.issues.map(issue => `<div class="issue ${issue.severity}"><strong>${issue.category}:</strong> ${issue.message}</div>`).join('')}
          ` : ''}

          ${seoReport.data?.seoReport?.checks?.length > 0 ? `
          <h2>✅ Passed (${seoReport.data.seoReport.checks.length})</h2>
          ${seoReport.data.seoReport.checks.map(check => `<div class="check"><strong>${check.category}:</strong> ${check.message}</div>`).join('')}
          ` : ''}

          ${seoReport.data?.seoReport?.recommendations?.length > 0 ? `
          <h2>💡 Recommendations</h2>
          ${seoReport.data.seoReport.recommendations.map(rec => `<div class="recommendation"><strong>${rec.category}:</strong> ${rec.message}</div>`).join('')}
          ` : ''}

          <div class="footer">Generated by Echo5 SEO Operations Platform • ${new Date().getFullYear()}</div>
        </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
    } catch (err) {
      console.error('PDF export error:', err)
      alert(`Failed to export PDF: ${err.message}`)
    }
  }
  
  const getPrimaryKeywordsForClient = (pageClientId) => {
    const clientIdToMatch = typeof pageClientId === 'string' ? pageClientId : pageClientId?._id
    return (keywords || []).filter(kw => {
      const kwClientId = typeof kw.clientId === 'string' ? kw.clientId : kw.clientId?._id
      return kwClientId === clientIdToMatch && kw.keywordType === 'Primary'
    })
  }

  const getScoreColor = (score) => {
    if (!score && score !== 0) return 'bg-gray-100 text-gray-500'
    if (score >= 80) return 'bg-emerald-100 text-emerald-700'
    if (score >= 60) return 'bg-amber-100 text-amber-700'
    if (score >= 40) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const getScoreIcon = (score) => {
    if (!score && score !== 0) return null
    if (score >= 80) return <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
    if (score >= 60) return <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
    return <XCircleIcon className="w-4 h-4 text-red-600" />
  }

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Page Optimizer</h1>
              <p className="text-gray-500 mt-1 text-sm">Analyze and optimize your pages for better SEO performance</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setSelectedId(''); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
              >
                <option value="">Select Client</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              {clientId && (
                <button
                  className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors"
                  disabled={syncing}
                  onClick={async () => {
                    try {
                      setSyncing(true)
                      const token = useAuthStore.getState().token
                      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/sync-from-audits?clientId=${clientId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                      await fetchPages(clientId)
                    } finally {
                      setSyncing(false)
                    }
                  }}
                >
                  <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing…' : 'Sync'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Only show when client selected */}
        {clientId && pages?.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-xs text-gray-500">Total Pages</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.excellent}</div>
                  <div className="text-xs text-gray-500">Excellent (80+)</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{stats.needsWork}</div>
                  <div className="text-xs text-gray-500">Needs Work</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">{stats.avgScore}</div>
                  <div className="text-xs text-gray-500">Avg Score</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {(!clientId) ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Client</h3>
              <p className="text-gray-500 text-sm">Choose a client from the dropdown above to view and optimize their pages</p>
            </div>
          ) : loading ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading pages…</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 text-red-700 rounded-lg m-4">{error}</div>
          ) : mainPages.length === 0 && !searchTerm && scoreFilter === 'all' ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pages Found</h3>
              <p className="text-gray-500 text-sm mb-6">Run an audit to discover and analyze pages for this client</p>
              <button
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                disabled={auditProgress.isRunning}
                onClick={async () => {
                  try {
                    await runAudit(clientId)
                    setTimeout(() => fetchPages(clientId), 4000)
                    setTimeout(() => fetchPages(clientId), 8000)
                    setTimeout(() => fetchPages(clientId), 15000)
                  } catch {}
                }}
              >
                {auditProgress.isRunning ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Running Audit…
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    Run Site Audit
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Search & Filter Bar */}
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search pages by URL, title, or keyword..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                    <select
                      value={scoreFilter}
                      onChange={(e) => setScoreFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Scores</option>
                      <option value="excellent">Excellent (80+)</option>
                      <option value="good">Good (60-79)</option>
                      <option value="needs-work">Needs Work (40-59)</option>
                      <option value="poor">Poor (&lt;40)</option>
                    </select>
                    <button
                      className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-2 transition-colors"
                      disabled={refreshingAll}
                      title="Refresh SEO scores for all pages"
                      onClick={async () => {
                        try {
                          setRefreshingAll(true)
                          const result = await refreshAllSEOScores(clientId, true) // Only refresh pages without scores
                          if (result.total === 0) {
                            alert('All pages already have SEO scores!')
                          } else {
                            alert(`Refreshed ${result.completed} of ${result.total} pages${result.failed > 0 ? ` (${result.failed} failed)` : ''}`)
                          }
                        } catch (err) {
                          alert(`Failed to refresh: ${err.message}`)
                        } finally {
                          setRefreshingAll(false)
                        }
                      }}
                    >
                      <ArrowPathIcon className={`w-4 h-4 ${refreshingAll ? 'animate-spin' : ''}`} />
                      {refreshingAll ? 'Refreshing...' : 'Refresh All Scores'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Pages List */}
              <div className="divide-y divide-gray-100">
                {mainPages.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No pages match your search or filter criteria
                  </div>
                ) : (
                  mainPages.map((p, idx) => {
                    const score = p.seo?.seoScore
                    const isSelected = selectedId === p._id
                    
                    return (
                      <div 
                        key={p._id}
                        onClick={() => setSelectedId(isSelected ? '' : p._id)}
                        className={`p-4 cursor-pointer transition-all hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : ''}`}
                      >
                        {/* Page Row - Responsive */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                          {/* Score Badge */}
                          <div className="flex items-center gap-3 lg:w-20 shrink-0">
                            <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${getScoreColor(score)}`}>
                              <span className="text-lg font-bold">{score ?? '—'}</span>
                              <span className="text-[10px] opacity-70">score</span>
                            </div>
                          </div>
                          
                          {/* Page Info */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-start gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate flex-1" title={p.title || p.url}>
                                {p.title || <span className="text-gray-400 italic">Untitled Page</span>}
                              </h3>
                              {getScoreIcon(score)}
                            </div>
                            <a 
                              href={p.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={e => e.stopPropagation()}
                              className="text-sm text-blue-600 hover:underline truncate block"
                              title={p.url}
                            >
                              {p.url?.replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                            {/* Mobile Stats - includes SEO score */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 lg:hidden">
                              <span className={`flex items-center gap-1 font-semibold ${
                                score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : score >= 40 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                <ChartBarIcon className="w-3.5 h-3.5" />
                                {score ?? '—'}/100
                              </span>
                              <span className="flex items-center gap-1">
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                {p.content?.wordCount || 0} words
                              </span>
                              <span className="flex items-center gap-1">
                                <LinkIcon className="w-3.5 h-3.5" />
                                {p.content?.links?.internal || 0} links
                              </span>
                              <span className="flex items-center gap-1">
                                <PhotoIcon className="w-3.5 h-3.5" />
                                {p.images?.length || 0} images
                              </span>
                            </div>
                          </div>
                          
                          {/* Desktop Stats - includes SEO score */}
                          <div className="hidden lg:flex items-center gap-6 text-sm text-gray-600 shrink-0">
                            <div className="text-center w-16">
                              <div className={`text-xl font-bold ${
                                score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : score >= 40 ? 'text-orange-600' : score ? 'text-red-600' : 'text-gray-400'
                              }`}>{score ?? '—'}</div>
                              <div className="text-xs text-gray-400">SEO</div>
                            </div>
                            <div className="text-center w-16">
                              <div className="font-semibold text-gray-900">{p.content?.wordCount || 0}</div>
                              <div className="text-xs text-gray-400">words</div>
                            </div>
                            <div className="text-center w-16">
                              <div className="font-semibold text-gray-900">{p.content?.links?.internal || 0}</div>
                              <div className="text-xs text-gray-400">links</div>
                            </div>
                            <div className="text-center w-16">
                              <div className="font-semibold text-gray-900">{p.images?.length || 0}</div>
                              <div className="text-xs text-gray-400">images</div>
                            </div>
                          </div>
                          
                          {/* Focus Keyword */}
                          <div className="lg:w-44 shrink-0" onClick={e => e.stopPropagation()}>
                            <FocusEditor 
                              page={p} 
                              onSave={updateFocusKeyword} 
                              keywords={getPrimaryKeywordsForClient(p.clientId)}
                            />
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50"
                              disabled={recrawling[p._id]}
                              title="Recrawl page"
                              onClick={async () => {
                                try {
                                  setRecrawling(prev => ({ ...prev, [p._id]: true }))
                                  await recrawlPage(p._id)
                                } catch (err) {
                                  alert(`Failed to recrawl: ${err.message}`)
                                } finally {
                                  setRecrawling(prev => ({ ...prev, [p._id]: false }))
                                }
                              }}
                            >
                              <ArrowPathIcon className={`w-4 h-4 ${recrawling[p._id] ? 'animate-spin' : ''}`} />
                            </button>
                            <Link href={`/page/${p._id}`} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors" title="View details">
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Content Preview */}
                              <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-gray-900">Content Preview</h4>
                                  <button
                                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium"
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      try { 
                                        await refreshContent(p._id)
                                      } catch (err) {
                                        alert(`Failed: ${err.message}`)
                                      }
                                    }}
                                  >
                                    {p.content?.blocks?.length > 0 ? 'Refresh' : 'Capture Content'}
                                  </button>
                                </div>
                                
                                {Array.isArray(p.content?.blocks) && p.content.blocks.length > 0 ? (
                                  <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-auto space-y-3">
                                    {p.content.blocks.slice(0, 10).map((b, idx) => (
                                      <div key={idx} className="flex items-start gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                          b.tag?.match(/^h[1-2]$/) ? 'bg-indigo-100 text-indigo-700' :
                                          b.tag?.match(/^h[3-6]$/) ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-200 text-gray-600'
                                        }`}>{b.tag}</span>
                                        <span className={`text-sm break-words ${b.tag?.match(/^h[1-3]$/) ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                          {b.text?.substring(0, 150)}{b.text?.length > 150 ? '…' : ''}
                                        </span>
                                      </div>
                                    ))}
                                    {p.content.blocks.length > 10 && (
                                      <div className="text-xs text-gray-500 text-center pt-2">
                                        +{p.content.blocks.length - 10} more blocks
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 break-words">
                                    {p.content?.sample?.substring(0, 300) || 'No content captured. Click "Capture Content" to fetch.'}
                                    {p.content?.sample?.length > 300 && '…'}
                                  </div>
                                )}
                              </div>
                              
                              {/* SEO Details */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-gray-900">SEO Details</h4>
                                  <div className="flex gap-2">
                                    <button
                                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-medium"
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try { await checkSEO(p._id) } catch {}
                                      }}
                                    >
                                      Analyze
                                    </button>
                                    <button
                                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium flex items-center gap-1"
                                      onClick={(e) => { e.stopPropagation(); exportToPDF(p) }}
                                    >
                                      <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                                      PDF
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Prominent SEO Score */}
                                <div className={`rounded-xl p-4 text-center ${
                                  score >= 80 ? 'bg-emerald-50 border border-emerald-200' :
                                  score >= 60 ? 'bg-amber-50 border border-amber-200' :
                                  score >= 40 ? 'bg-orange-50 border border-orange-200' :
                                  score ? 'bg-red-50 border border-red-200' :
                                  'bg-gray-50 border border-gray-200'
                                }`}>
                                  <div className={`text-4xl font-bold ${
                                    score >= 80 ? 'text-emerald-600' :
                                    score >= 60 ? 'text-amber-600' :
                                    score >= 40 ? 'text-orange-600' :
                                    score ? 'text-red-600' :
                                    'text-gray-400'
                                  }`}>
                                    {score ?? '—'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">SEO Score</div>
                                  <div className={`text-xs font-medium mt-1 ${
                                    score >= 80 ? 'text-emerald-700' :
                                    score >= 60 ? 'text-amber-700' :
                                    score >= 40 ? 'text-orange-700' :
                                    score ? 'text-red-700' :
                                    'text-gray-500'
                                  }`}>
                                    {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : score ? 'Poor' : 'Not Analyzed'}
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">H1 Heading</div>
                                    <div className="text-gray-900 font-medium truncate" title={p.h1}>{p.h1 || <span className="text-gray-400">Not set</span>}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Meta Description</div>
                                    <div className="text-gray-700 text-xs line-clamp-2 break-words">{p.metaDescription || <span className="text-gray-400">Not set</span>}</div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                                    <div>
                                      <div className="text-xs text-gray-500">Canonical</div>
                                      <div className="text-xs text-gray-700 truncate">{p.seo?.canonical ? '✓ Set' : '✗ Missing'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Robots</div>
                                      <div className="text-xs text-gray-700">{p.seo?.robots || 'index,follow'}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50/50 text-center text-sm text-gray-500">
                Showing {mainPages.length} of {pages?.length || 0} pages
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

function FocusEditor({ page, onSave, keywords = [] }) {
  const [value, setValue] = useState(page?.seo?.focusKeyword || '')
  const [saving, setSaving] = useState(false)
  
  const handleChange = async (newValue) => {
    setValue(newValue)
    if (newValue.trim()) {
      try {
        setSaving(true)
        await onSave(page._id, newValue.trim())
      } catch (error) {
        console.error('Failed to save focus keyword:', error)
      } finally {
        setSaving(false)
      }
    }
  }
  
  return (
    <select
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 truncate"
      value={value}
      onChange={e => handleChange(e.target.value)}
      disabled={saving}
      onClick={e => e.stopPropagation()}
    >
      <option value="">Focus keyword…</option>
      {keywords.map(kw => (
        <option key={kw._id} value={kw.keyword}>{kw.keyword}</option>
      ))}
    </select>
  )
}
