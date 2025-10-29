import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import useClientStore from '../store/clients'
import useAuditStore from '../store/audits'
import useAuthStore from '../store/auth'
import usePagesStore from '../store/pages'
import useKeywordStore from '../store/keywords'

export default function Pages() {
  const { clients, fetchClients } = useClientStore()
  const { pages, fetchPages, fetchPage, updateFocusKeyword, refreshContent, recrawlPage, checkSEO, error, loading } = usePagesStore()
  const { runAudit, auditProgress } = useAuditStore()
  const { keywords, fetchKeywords } = useKeywordStore()
  const [syncing, setSyncing] = useState(false)
  const [recrawling, setRecrawling] = useState({})
  const [clientId, setClientId] = useState('')
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => { fetchClients() }, [fetchClients])
  useEffect(() => { fetchKeywords() }, [fetchKeywords])
  useEffect(() => { if (clientId) fetchPages(clientId) }, [clientId, fetchPages])

  // Show all pages from database (backend already filters excluded pages)
  const mainPages = useMemo(() => {
    // Backend already filters out excluded pages via { excluded: { $ne: true } }
    // So we just return all pages we received
    const filtered = pages || [];
    
    console.log(`Pages: ${pages?.length || 0} total, ${filtered.length} displayed`);
    
    return filtered;
  }, [pages]);

  const selectedPage = useMemo(() => pages.find(p => p._id === selectedId), [pages, selectedId])
  
  // Get primary keywords for the selected client
  const getPrimaryKeywordsForClient = (pageClientId) => {
    // Handle both string ID and populated object
    const clientIdToMatch = typeof pageClientId === 'string' ? pageClientId : pageClientId?._id
    
    return (keywords || []).filter(kw => {
      const kwClientId = typeof kw.clientId === 'string' ? kw.clientId : kw.clientId?._id
      return kwClientId === clientIdToMatch && kw.keywordType === 'Primary'
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Pages</h1>
          <div>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="">Select Client</option>
              {clients.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {clientId && (
              <button
                className="ml-3 px-3 py-2 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
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
              >{syncing ? 'Syncing…' : 'Sync from last audit'}</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          {(!clientId) ? (
            <div className="p-12 text-center text-gray-500">Select a client to view pages</div>
          ) : loading ? (
            <div className="p-12 text-center text-gray-500">Loading pages…</div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
          ) : mainPages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-700 mb-3">No pages found for this client.</div>
              <div className="flex items-center justify-center gap-3">
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                  disabled={!clientId || auditProgress.isRunning}
                  onClick={async () => {
                    try {
                      await runAudit(clientId)
                      // Poll pages list a few times to reflect persisted pages
                      setTimeout(() => fetchPages(clientId), 4000)
                      setTimeout(() => fetchPages(clientId), 8000)
                      setTimeout(() => fetchPages(clientId), 15000)
                    } catch {}
                  }}
                >{auditProgress.isRunning ? 'Audit running…' : 'Run audit now'}</button>
              </div>
              <div className="text-xs text-gray-500 mt-2">Audits run async and may take a minute. This page will refresh automatically.</div>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-700 to-gray-800 text-white text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">URL</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-center font-semibold">Score</th>
                    <th className="px-4 py-3 text-center font-semibold">Focus Keyword</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mainPages.map((p, idx) => {
                    const score = p.seo?.seoScore;
                    
                    return (
                    <tr key={p._id}
                        onClick={async () => { 
                          setSelectedId(p._id); 
                          if (!p?.content?.sample) { 
                            try { 
                              await refreshContent(p._id);
                              await checkSEO(p._id);
                            } catch (err) {
                              console.error('Auto-capture error:', err)
                              alert(`Failed to auto-capture content: ${err.message}`)
                            } 
                          } 
                        }}
                        className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${selectedId === p._id ? 'bg-blue-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 text-gray-700 font-semibold">{idx + 1}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-medium max-w-md truncate block hover:underline" title={p.url}>
                          {p.url}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 text-sm font-medium max-w-xs truncate" title={p.title}>
                          {p.title || <span className="text-gray-400 italic">No title</span>}
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
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <FocusEditor 
                          page={p} 
                          onSave={updateFocusKeyword} 
                          keywords={getPrimaryKeywordsForClient(p.clientId)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors"
                            disabled={recrawling[p._id]}
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                setRecrawling(prev => ({ ...prev, [p._id]: true }))
                                await recrawlPage(p._id)
                                alert('Page recrawled successfully!')
                              } catch (err) {
                                console.error('Recrawl error:', err)
                                alert(`Failed to recrawl page: ${err.message}`)
                              } finally {
                                setRecrawling(prev => ({ ...prev, [p._id]: false }))
                              }
                            }}
                          >{recrawling[p._id] ? 'Recrawling…' : 'Recrawl'}</button>
                          <Link href={`/page/${p._id}`} legacyBehavior>
                            <a className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold rounded transition-colors" onClick={e => e.stopPropagation()}>Details</a>
                          </Link>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {selectedPage && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">{selectedPage.title}</h2>
                    <a className="text-sm text-blue-600 underline" href={selectedPage.url} target="_blank" rel="noreferrer">Open page</a>
                  </div>
                  <div className="text-xs text-gray-500 mb-4 break-all">{selectedPage.url}</div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Content preview</h3>
                      <button
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
                        onClick={async () => { 
                          try { 
                            await refreshContent(selectedPage._id)
                            alert('Content captured successfully!')
                          } catch (err) {
                            console.error('Capture content error:', err)
                            alert(`Failed to capture content: ${err.message}`)
                          }
                        }}
                      >{selectedPage?.content?.sample ? 'Re-capture content' : 'Capture content'}</button>
                    </div>
                    {Array.isArray(selectedPage?.content?.blocks) && selectedPage.content.blocks.length > 0 ? (
                      <div className="bg-gray-50 border rounded p-3 max-h-80 overflow-auto divide-y">
                        {selectedPage.content.blocks.map((b, idx) => (
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
                      <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border rounded p-3 max-h-80 overflow-auto">
                        {selectedPage?.content?.sample || 'No content captured for this page.'}
                      </div>
                    )}
                  </div>
                  {Array.isArray(selectedPage?.content?.internalLinks) && selectedPage.content.internalLinks.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Internal Links ({selectedPage.content.internalLinks.length})</h3>
                      <div className="bg-gray-50 border rounded p-3 max-h-64 overflow-auto space-y-2">
                        {selectedPage.content.internalLinks.map((link, idx) => (
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
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">SEO Score</div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded text-sm font-semibold ${
                        (selectedPage.seo?.seoScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                        (selectedPage.seo?.seoScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        (selectedPage.seo?.seoScore || 0) >= 40 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>{selectedPage.seo?.seoScore ?? 'N/A'}</div>
                      <button
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={async () => {
                          try {
                            await checkSEO(selectedPage._id)
                            alert('SEO analysis complete!')
                          } catch (err) {
                            console.error('SEO check error:', err)
                            alert(`Failed to analyze SEO: ${err.message}`)
                          }
                        }}
                      >Analyze</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Focus keyword</div>
                    <FocusEditor 
                      page={selectedPage} 
                      onSave={updateFocusKeyword} 
                      keywords={getPrimaryKeywordsForClient(selectedPage.clientId)}
                    />
                  </div>
                  <div className="text-sm"><span className="text-gray-500">H1:</span> <span className="text-gray-800">{selectedPage.h1 || '—'}</span></div>
                  <div className="text-sm"><span className="text-gray-500">Meta description:</span>
                    <div className="text-gray-800 mt-1 whitespace-pre-wrap break-words">{selectedPage.metaDescription || '—'}</div>
                  </div>
                  <div className="text-sm flex flex-col gap-1">
                    <div><span className="text-gray-500">Canonical:</span> <span className="text-gray-800 break-all">{selectedPage.seo?.canonical || '—'}</span></div>
                    <div><span className="text-gray-500">Robots:</span> <span className="text-gray-800">{selectedPage.seo?.robots || 'index,follow'}</span></div>
                  </div>
                  <div className="text-sm grid grid-cols-3 gap-2 pt-2">
                    <Stat label="Words" value={selectedPage?.content?.wordCount ?? '—'} />
                    <Stat label="Internal links" value={selectedPage?.content?.links?.internal ?? '—'} />
                    <Stat label="Images" value={Array.isArray(selectedPage?.images) ? selectedPage.images.length : '—'} />
                  </div>
                </div>
              </div>
            )}
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
    <div className="flex items-center gap-2">
      <select
        className="px-3 py-1.5 border rounded w-56 disabled:opacity-50"
        value={value}
        onChange={e => handleChange(e.target.value)}
        disabled={saving}
      >
        <option value="">Select focus keyword</option>
        {keywords.map(kw => (
          <option key={kw._id} value={kw.keyword}>{kw.keyword}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-gray-500">Saving...</span>}
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
