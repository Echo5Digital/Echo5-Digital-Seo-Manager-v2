import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import Layout from '../../components/Layout'
import usePagesStore from '../../store/pages'
import useAuthStore from '../../store/auth'
import SEOFixSuggestionsModal from '../../components/SEOFixSuggestionsModal'
import AssignTasksModal from '../../components/AssignTasksModal'

export default function PageDetail() {
  const router = useRouter()
  const { id } = router.query
  const { pages, fetchPage, updateFocusKeyword, refreshContent, recrawlPage, checkSEO, suggestSEOFixes } = usePagesStore()
  const [loading, setLoading] = useState(false)
  const [recrawling, setRecrawling] = useState(false)
  const [checking, setChecking] = useState(false)
  const [seoReport, setSeoReport] = useState(null)
  const [showFixesModal, setShowFixesModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedFixes, setSelectedFixes] = useState([])
  const [generatingFixes, setGeneratingFixes] = useState(false)
  const page = useMemo(() => pages.find(p => p._id === id), [pages, id])

  useEffect(() => {
    let active = true
    async function run() {
      if (!id) return
      if (page && page.content && page.content.sample) return
      setLoading(true)
      try {
        await fetchPage(id)
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => { active = false }
  }, [id])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Page Details</h1>
            <div className="text-xs text-gray-500 mt-1">{page?.url || ''}</div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-700 underline" onClick={() => router.push('/pages')}>Back to list</button>
            {page?._id && (
              <button
                className="px-3 py-1.5 rounded bg-green-600 text-white text-sm disabled:opacity-50"
                disabled={recrawling}
                onClick={async () => {
                  try {
                    setRecrawling(true)
                    await recrawlPage(page._id)
                  } finally {
                    setRecrawling(false)
                  }
                }}
              >{recrawling ? 'Recrawling…' : 'Recrawl Page'}</button>
            )}
            {page?.url && (
              <a className="text-sm text-blue-600 underline" href={page.url} target="_blank" rel="noreferrer">Open page</a>
            )}
          </div>
        </div>

        {(!page && loading) && (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        )}

        {page && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">{page.title}</h2>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Content preview</h3>
                  {!page?.content?.sample && (
                    <button
                      className="px-2 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50"
                      onClick={async () => { try { await refreshContent(page._id) } catch {} }}
                    >Capture content</button>
                  )}
                </div>
                
                {/* Show H1 First */}
                {page.h1 && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-600 text-white font-bold">H1</span>
                      <span className="text-xs text-indigo-600 font-semibold">Main Heading</span>
                    </div>
                    <div className="text-base font-bold text-gray-900">{page.h1}</div>
                  </div>
                )}
                
                {Array.isArray(page?.content?.blocks) && page.content.blocks.length > 0 ? (
                  <div className="bg-gray-50 border rounded p-3 max-h-[70vh] overflow-auto divide-y">
                    {page.content.blocks.map((b, idx) => (
                      <div key={idx} className="py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border bg-white text-gray-700">{b.tag}</span>
                          {/^h[1-6]$/.test(b.tag || '') && (
                            <span className="text-xs text-gray-500">Heading</span>
                          )}
                        </div>
                        <div className={`text-sm ${/^h[1-6]$/.test(b.tag || '') ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{b.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border rounded p-3 max-h-[70vh] overflow-auto">
                    {page?.content?.sample || 'No content captured for this page.'}
                  </div>
                )}
              </div>
              {Array.isArray(page?.content?.internalLinks) && page.content.internalLinks.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Internal Links ({page.content.internalLinks.length})</h3>
                  <div className="bg-gray-50 border rounded p-3 max-h-96 overflow-auto space-y-2">
                    {page.content.internalLinks.map((link, idx) => (
                      <div key={idx} className="text-xs border-b border-gray-200 pb-2 last:border-b-0">
                        <div className="font-medium text-gray-900 mb-1">"{link.anchorText}"</div>
                        <div className="flex items-center gap-2">
                          <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all flex-1">{link.url}</a>
                          {link.isNofollow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border">nofollow</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <ScoreBadge value={page?.seo?.seoScore} />
              
              {/* Individual Score Components */}
              {page && (
                <div className="border-t pt-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Score Breakdown</div>
                  
                  <ScoreItem 
                    label="Title" 
                    score={page.title ? (page.title.length >= 30 && page.title.length <= 60 ? 100 : page.title.length < 30 ? 50 : 70) : 0}
                    icon={
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd" />
                      </svg>
                    }
                  />
                  
                  <ScoreItem 
                    label="Meta Desc" 
                    score={page.metaDescription ? (page.metaDescription.length >= 120 && page.metaDescription.length <= 160 ? 100 : page.metaDescription.length < 120 ? 60 : 80) : 0}
                    icon={
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    }
                  />
                  
                  <ScoreItem 
                    label="H1 Tag" 
                    score={page.h1 ? 100 : 0}
                    icon={
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 0v8h12V6H4z" />
                      </svg>
                    }
                  />
                  
                  <ScoreItem 
                    label="Content" 
                    score={page.content?.wordCount ? (page.content.wordCount >= 300 ? 100 : Math.round((page.content.wordCount / 300) * 100)) : 0}
                    icon={
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    }
                  />
                  
                  <ScoreItem 
                    label="Images Alt" 
                    score={
                      Array.isArray(page.images) && page.images.length > 0
                        ? Math.round((page.images.filter(img => img.alt && img.alt.trim()).length / page.images.length) * 100)
                        : page.images?.length === 0 ? 50 : 0
                    }
                    icon={
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    }
                  />
                  
                  <ScoreItem 
                    label="Links" 
                    score={
                      page.content?.links?.internal 
                        ? (page.content.links.internal >= 3 ? 100 : Math.round((page.content.links.internal / 3) * 100))
                        : 0
                    }
                    icon={
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                    }
                  />
                  
                  {page.seo?.focusKeyword && (
                    <ScoreItem 
                      label="Keyword" 
                      score={
                        page.keywords?.find(k => k.keyword === page.seo.focusKeyword)
                          ? Math.min(100, Math.round(
                              (page.keywords.find(k => k.keyword === page.seo.focusKeyword).inTitle ? 40 : 0) +
                              (page.keywords.find(k => k.keyword === page.seo.focusKeyword).inH1 ? 30 : 0) +
                              (page.keywords.find(k => k.keyword === page.seo.focusKeyword).inMeta ? 20 : 0) +
                              (page.keywords.find(k => k.keyword === page.seo.focusKeyword).density > 0 && page.keywords.find(k => k.keyword === page.seo.focusKeyword).density <= 2.5 ? 10 : 0)
                            ))
                          : 0
                      }
                      icon={
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      }
                    />
                  )}
                  
                  <ScoreItem 
                    label="Technical" 
                    score={
                      ((page.technical?.https ? 40 : 0) +
                       (page.technical?.mobile ? 30 : 0) +
                       (page.seo?.canonical ? 30 : 0))
                    }
                    icon={
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    }
                  />
                </div>
              )}
              
              <div>
                <div className="text-xs text-gray-500 mb-1">Focus keyword</div>
                <FocusEditor 
                  page={page} 
                  onSave={updateFocusKeyword}
                  checkingState={checking}
                  onCheckSEO={async () => {
                    try {
                      setChecking(true)
                      const result = await checkSEO(page._id)
                      setSeoReport(result.seoReport)
                    } catch (err) {
                      console.error('SEO check failed:', err)
                    } finally {
                      setChecking(false)
                    }
                  }}
                />
              </div>
              <Meta label="H1" value={page?.h1} />
              <Meta label="Meta description" value={page?.metaDescription} long />
              <Meta label="Canonical" value={page?.seo?.canonical} />
              <Meta label="Robots" value={page?.seo?.robots || 'index,follow'} />
              <div className="text-sm grid grid-cols-3 gap-2 pt-2">
                <Stat label="Words" value={page?.content?.wordCount ?? '—'} />
                <Stat label="Internal links" value={page?.content?.links?.internal ?? '—'} />
                <Stat label="Images" value={Array.isArray(page?.images) ? page.images.length : '—'} />
              </div>
            </div>
          </div>

          {seoReport && (
            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">SEO Analysis Report</h2>
                  <p className="text-indigo-100 text-sm mt-1">Comprehensive analysis based on industry best practices</p>
                </div>
                <button
                  onClick={() => setSeoReport(null)}
                  className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                >✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Score Overview with Pie Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* SEO Score Pie Chart */}
                  <div className="bg-white rounded-xl border-2 border-indigo-100 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Overall SEO Score</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative" style={{ width: 220, height: 220 }}>
                        <PieChart width={220} height={220}>
                          <Pie
                            data={[
                              { name: 'Score', value: seoReport.score },
                              { name: 'Missing', value: 100 - seoReport.score }
                            ]}
                            cx={110}
                            cy={110}
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            <Cell fill={
                              seoReport.score >= 80 ? '#10b981' :
                              seoReport.score >= 60 ? '#f59e0b' :
                              seoReport.score >= 40 ? '#f97316' : '#ef4444'
                            } />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-4xl font-bold ${
                              seoReport.score >= 80 ? 'text-green-600' :
                              seoReport.score >= 60 ? 'text-yellow-600' :
                              seoReport.score >= 40 ? 'text-orange-600' : 'text-red-600'
                            }`}>{seoReport.score}</div>
                            <div className="text-xs text-gray-500 font-medium">out of 100</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                      seoReport.score >= 80 ? 'bg-green-50 text-green-700' :
                      seoReport.score >= 60 ? 'bg-yellow-50 text-yellow-700' :
                      seoReport.score >= 40 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {seoReport.score >= 80 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : seoReport.score >= 60 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                      ) : seoReport.score >= 40 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <p className="font-semibold">
                        {seoReport.score >= 80 ? 'Excellent!' :
                         seoReport.score >= 60 ? 'Good Progress' :
                         seoReport.score >= 40 ? 'Needs Improvement' : 'Critical Issues'}
                      </p>
                    </div>
                  </div>

                  {/* Issues Breakdown Pie Chart */}
                  <div className="bg-white rounded-xl border-2 border-indigo-100 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">What's Missing</h3>
                    <div className="flex items-center justify-center" style={{ width: '100%', height: 220 }}>
                      <PieChart width={300} height={220}>
                        <Pie
                          data={[
                            { name: 'Passed', value: seoReport.summary.passedChecks, color: '#10b981' },
                            { name: 'Critical', value: seoReport.summary.criticalIssues, color: '#ef4444' },
                            { name: 'High', value: seoReport.summary.highIssues, color: '#f97316' },
                            { name: 'Medium', value: seoReport.summary.mediumIssues, color: '#f59e0b' },
                            { name: 'Low', value: seoReport.summary.lowIssues, color: '#94a3b8' }
                          ].filter(item => item.value > 0)}
                          cx={150}
                          cy={110}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {[
                            { name: 'Passed', value: seoReport.summary.passedChecks, color: '#10b981' },
                            { name: 'Critical', value: seoReport.summary.criticalIssues, color: '#ef4444' },
                            { name: 'High', value: seoReport.summary.highIssues, color: '#f97316' },
                            { name: 'Medium', value: seoReport.summary.mediumIssues, color: '#f59e0b' },
                            { name: 'Low', value: seoReport.summary.lowIssues, color: '#94a3b8' }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {seoReport.summary.passedChecks > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-gray-700">Passed: {seoReport.summary.passedChecks}</span>
                        </div>
                      )}
                      {seoReport.summary.criticalIssues > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-gray-700">Critical: {seoReport.summary.criticalIssues}</span>
                        </div>
                      )}
                      {seoReport.summary.highIssues > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="text-gray-700">High: {seoReport.summary.highIssues}</span>
                        </div>
                      )}
                      {seoReport.summary.mediumIssues > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-gray-700">Medium: {seoReport.summary.mediumIssues}</span>
                        </div>
                      )}
                      {seoReport.summary.lowIssues > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-gray-700">Low: {seoReport.summary.lowIssues}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-3 text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold text-green-700">{seoReport.summary.passedChecks}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-green-600 font-medium mt-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Passed</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-3 text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold text-red-700">{seoReport.summary.criticalIssues}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-red-600 font-medium mt-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>Critical</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-3 text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold text-orange-700">{seoReport.summary.highIssues}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-orange-600 font-medium mt-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>High</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-3 text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold text-yellow-700">{seoReport.summary.mediumIssues}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-yellow-600 font-medium mt-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Medium</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-3 text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold text-gray-700">{seoReport.summary.lowIssues}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600 font-medium mt-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Low</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-3 text-center transform hover:scale-105 transition-transform">
                    <div className="text-2xl font-bold text-purple-700">{seoReport.summary.recommendations}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-purple-600 font-medium mt-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                      </svg>
                      <span>Tips</span>
                    </div>
                  </div>
                </div>

                {/* Issues Section */}
                {seoReport.issues.length > 0 && (
                  <div className="bg-white rounded-xl border-2 border-red-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-red-100 rounded-full p-2">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Issues Found ({seoReport.issues.length})</h3>
                    </div>
                    <div className="space-y-3">
                      {seoReport.issues.map((issue, idx) => (
                        <div 
                          key={idx}
                          className={`p-4 border-l-4 rounded-lg shadow-sm transform hover:scale-[1.02] transition-transform ${
                            issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                            issue.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                            issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                            'bg-gray-50 border-gray-400'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 rounded-full p-1.5 flex items-center justify-center ${
                              issue.severity === 'critical' ? 'bg-red-200 text-red-700' :
                              issue.severity === 'high' ? 'bg-orange-200 text-orange-700' :
                              issue.severity === 'medium' ? 'bg-yellow-200 text-yellow-700' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {issue.severity === 'critical' ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              ) : issue.severity === 'high' ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              ) : issue.severity === 'medium' ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900">{issue.category}</span>
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide ${
                                  issue.severity === 'critical' ? 'bg-red-600 text-white' :
                                  issue.severity === 'high' ? 'bg-orange-600 text-white' :
                                  issue.severity === 'medium' ? 'bg-yellow-600 text-white' :
                                  'bg-gray-600 text-white'
                                }`}>{issue.severity}</span>
                              </div>
                              <div className="text-sm text-gray-700 leading-relaxed">{issue.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Passed Checks Section */}
                {seoReport.checks.length > 0 && (
                  <div className="bg-white rounded-xl border-2 border-green-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-green-100 rounded-full p-2">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Passed Checks ({seoReport.checks.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {seoReport.checks.map((check, idx) => (
                        <div 
                          key={idx}
                          className="p-3 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-2 hover:bg-green-100 transition-colors"
                        >
                          <div className="bg-green-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <span className="text-xs font-bold text-green-800 uppercase tracking-wide">{check.category}:</span>
                            <span className="text-xs text-gray-700 ml-1">{check.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Section */}
                {seoReport.recommendations.length > 0 && (
                  <div className="bg-white rounded-xl border-2 border-purple-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-purple-100 rounded-full p-2">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Recommendations ({seoReport.recommendations.length})</h3>
                    </div>
                    <div className="space-y-3">
                      {seoReport.recommendations.map((rec, idx) => (
                        <div 
                          key={idx}
                          className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-purple-200 rounded-full p-1.5 flex-shrink-0">
                              <svg className="w-4 h-4 text-purple-700" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-bold text-purple-900">{rec.category}:</span>
                              <span className="text-sm text-gray-700 ml-1">{rec.message}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI-Powered Fix Suggestions Button */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={async () => {
                      try {
                        setGeneratingFixes(true)
                        const result = await suggestSEOFixes(page._id, seoReport)
                        setSuggestions(result.suggestions)
                        setShowFixesModal(true)
                      } catch (err) {
                        console.error('Failed to generate fix suggestions:', err)
                        alert('Failed to generate AI suggestions. Please try again.')
                      } finally {
                        setGeneratingFixes(false)
                      }
                    }}
                    disabled={generatingFixes}
                    className={`w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-lg font-bold disabled:opacity-50 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 ${
                      generatingFixes ? 'cursor-wait' : ''
                    }`}
                  >
                    {generatingFixes ? (
                      <>
                        <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>AI is Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Suggest AI-Powered Fixes</span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Get specific, actionable recommendations from our AI SEO specialist
                  </p>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Modals */}
      <SEOFixSuggestionsModal
        isOpen={showFixesModal}
        suggestions={suggestions}
        onClose={() => setShowFixesModal(false)}
        onAssign={(selected) => {
          setSelectedFixes(selected)
          setShowFixesModal(false)
          setShowAssignModal(true)
        }}
      />

      <AssignTasksModal
        isOpen={showAssignModal}
        selectedFixes={selectedFixes}
        pageId={page?._id}
        pageTitle={page?.title}
        onClose={() => setShowAssignModal(false)}
        onCreated={(result) => {
          alert(`Successfully created ${result.count} task(s) and assigned to ${result.assignee}!`)
          setShowAssignModal(false)
          setSeoReport(null) // Close SEO report
        }}
      />
    </Layout>
  )
}

function Meta({ label, value, long }) {
  return (
    <div className="text-sm">
      <span className="text-gray-500">{label}:</span>
      <div className={`text-gray-800 ${long ? 'mt-1 whitespace-pre-wrap break-words' : ''}`}>{value || '—'}</div>
    </div>
  )
}

function ScoreBadge({ value }) {
  const v = value || 0
  const bgColor = v >= 80 ? 'bg-green-50' : v >= 60 ? 'bg-yellow-50' : v >= 40 ? 'bg-orange-50' : 'bg-red-50'
  const textColor = v >= 80 ? 'text-green-700' : v >= 60 ? 'text-yellow-700' : v >= 40 ? 'text-orange-700' : 'text-red-700'
  const borderColor = v >= 80 ? 'border-green-200' : v >= 60 ? 'border-yellow-200' : v >= 40 ? 'border-orange-200' : 'border-red-200'
  
  // Create gradient segments for more visual interest
  const segments = [
    { name: 'Excellent', value: Math.min(v, 20), fill: '#10b981', range: '80-100' },
    { name: 'Good', value: Math.min(Math.max(v - 20, 0), 20), fill: '#22c55e', range: '60-80' },
    { name: 'Fair', value: Math.min(Math.max(v - 40, 0), 20), fill: '#84cc16', range: '40-60' },
    { name: 'Weak', value: Math.min(Math.max(v - 60, 0), 20), fill: '#eab308', range: '20-40' },
    { name: 'Poor', value: Math.min(Math.max(v - 80, 0), 20), fill: '#f59e0b', range: '0-20' },
    { name: 'Missing', value: 100 - v, fill: '#e5e7eb', range: 'Gap' }
  ].filter(seg => seg.value > 0)
  
  const StatusIcon = () => {
    if (v >= 80) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    } else if (v >= 60) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      )
    } else if (v >= 40) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    } else if (v > 0) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    }
    return null
  }
  
  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-4`}>
      <div className="text-sm font-semibold text-gray-700 mb-3">SEO Performance</div>
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: 140, height: 140 }}>
          <PieChart width={140} height={140}>
            <Pie
              data={segments}
              cx={70}
              cy={70}
              innerRadius={40}
              outerRadius={60}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
            >
              {segments.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-2xl font-bold ${textColor}`}>
                {Number.isFinite(value) ? v : 'N/A'}
              </div>
              {Number.isFinite(value) && (
                <div className="text-[10px] text-gray-500 font-medium">/ 100</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Score breakdown */}
      {Number.isFinite(value) && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
              <span className="text-gray-600">Achieved</span>
            </div>
            <span className="font-semibold text-gray-700">{v}%</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span className="text-gray-600">Potential</span>
            </div>
            <span className="font-semibold text-gray-700">{100 - v}%</span>
          </div>
        </div>
      )}
      
      <div className={`mt-3 flex items-center justify-center gap-1 text-xs font-semibold ${textColor} pt-2 border-t ${borderColor}`}>
        <StatusIcon />
        <span>{v >= 80 ? 'Excellent' : v >= 60 ? 'Good' : v >= 40 ? 'Fair' : v > 0 ? 'Poor' : 'Not Analyzed'}</span>
      </div>
    </div>
  )
}

function FocusEditor({ page, onSave, onCheckSEO, checkingState }) {
  const [value, setValue] = useState(page?.seo?.focusKeyword || '')
  const [saving, setSaving] = useState(false)
  const [secondaryKeywords, setSecondaryKeywords] = useState(page?.seo?.secondaryKeywords || [])
  const [secondaryInput, setSecondaryInput] = useState('')
  
  useEffect(() => { 
    setValue(page?.seo?.focusKeyword || '')
    setSecondaryKeywords(page?.seo?.secondaryKeywords || [])
  }, [page?._id])
  
  const handleSecondaryKeyDown = (e) => {
    if (e.key === 'Enter' || (e.key === ' ' && secondaryInput.endsWith(' '))) {
      e.preventDefault()
      const keyword = secondaryInput.trim()
      if (keyword && !secondaryKeywords.includes(keyword)) {
        const newKeywords = [...secondaryKeywords, keyword]
        setSecondaryKeywords(newKeywords)
        setSecondaryInput('')
        // Auto-save secondary keywords
        saveSecondaryKeywords(newKeywords)
      }
    }
  }
  
  const removeSecondaryKeyword = (keyword) => {
    const newKeywords = secondaryKeywords.filter(k => k !== keyword)
    setSecondaryKeywords(newKeywords)
    saveSecondaryKeywords(newKeywords)
  }
  
  const saveSecondaryKeywords = async (keywords) => {
    try {
      const token = useAuthStore.getState().token
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pages/${page._id}/secondary-keywords`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ secondaryKeywords: keywords })
      })
    } catch (error) {
      console.error('Failed to save secondary keywords:', error)
    }
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          className="px-3 py-1.5 border rounded w-full"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Focus keyword"
        />
        <button
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
          disabled={saving || !value.trim()}
          onClick={async () => {
            try {
              setSaving(true)
              await onSave(page._id, value.trim())
            } finally {
              setSaving(false)
            }
          }}
        >{saving ? 'Saving…' : 'Save'}</button>
      </div>
      
      {/* Secondary Keywords */}
      <div className="space-y-2">
        <label className="text-xs text-gray-600 font-medium">Secondary Keywords</label>
        <input
          className="px-3 py-1.5 border rounded w-full text-sm"
          value={secondaryInput}
          onChange={e => setSecondaryInput(e.target.value)}
          onKeyDown={handleSecondaryKeyDown}
          placeholder="Type keyword and press Enter or double space"
        />
        {secondaryKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {secondaryKeywords.map((keyword, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
              >
                <span>{keyword}</span>
                <button
                  onClick={() => removeSecondaryKeyword(keyword)}
                  className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {page?.seo?.focusKeyword && (
        <button
          className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-sm font-bold disabled:opacity-50 hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
          disabled={checkingState}
          onClick={onCheckSEO}
        >
          {checkingState ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing SEO…</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analyze SEO Performance</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

function ScoreItem({ label, score, icon }) {
  const getColor = (s) => {
    if (s >= 80) return { bg: 'bg-green-100', text: 'text-green-700', fill: 'bg-green-500' }
    if (s >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', fill: 'bg-yellow-500' }
    if (s >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700', fill: 'bg-orange-500' }
    return { bg: 'bg-red-100', text: 'text-red-700', fill: 'bg-red-500' }
  }
  
  const colors = getColor(score)
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 flex-1">
        <div className={`${colors.bg} rounded p-1`}>
          {icon}
        </div>
        <span className="text-xs text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full ${colors.fill}`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
        <span className={`text-xs font-bold ${colors.text} w-8 text-right`}>
          {score}
        </span>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 border rounded p-2 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-semibold text-gray-900">{value}</div>
    </div>
  )
}
