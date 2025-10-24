import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import useClientStore from '../store/clients'
import usePagesStore from '../store/pages'

export default function Pages() {
  const { clients, fetchClients } = useClientStore()
  const { pages, fetchPages, fetchPage, updateFocusKeyword, refreshContent, error, loading } = usePagesStore()
  const [clientId, setClientId] = useState('')
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => { fetchClients() }, [fetchClients])
  useEffect(() => { if (clientId) fetchPages(clientId) }, [clientId, fetchPages])

  const selectedPage = useMemo(() => pages.find(p => p._id === selectedId), [pages, selectedId])

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
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          {(!clientId) ? (
            <div className="p-12 text-center text-gray-500">Select a client to view pages</div>
          ) : loading ? (
            <div className="p-12 text-center text-gray-500">Loading pages…</div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
          ) : pages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No pages found. Run an audit to populate pages.</div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SEO Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Focus Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pages.map(p => (
                    <tr key={p._id}
                        onClick={async () => { setSelectedId(p._id); if (!p?.content?.sample) { try { await fetchPage(p._id) } catch {} } }}
                        className={`${selectedId === p._id ? 'bg-blue-50' : ''} cursor-pointer hover:bg-gray-50`}
                    >
                      <td className="px-4 py-3 text-sm text-blue-600 underline" onClick={e => e.stopPropagation()}><a href={p.url} target="_blank" rel="noreferrer">{p.url}</a></td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{p.title}</span>
                          {(() => {
                            let isHome = p.slug === '__root__';
                            if (!isHome && p.slug === 'home') {
                              try { isHome = new URL(p.url).pathname.replace(/\/+$/,'') === '' || new URL(p.url).pathname.replace(/\/+$/,'') === '/'; } catch {}
                            }
                            return isHome ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border">Homepage</span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        <span className={`px-2 py-1 rounded ${
                          (p.seo?.seoScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                          (p.seo?.seoScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          (p.seo?.seoScore || 0) >= 40 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>{p.seo?.seoScore ?? 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <FocusEditor page={p} onSave={updateFocusKeyword} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <Link href={`/page/${p._id}`} legacyBehavior>
                            <a className="text-blue-600 underline" onClick={e => e.stopPropagation()}>View</a>
                          </Link>
                          <span className="text-xs text-gray-500">Updated {new Date(p.updatedAt).toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                      {!selectedPage?.content?.sample && (
                        <button
                          className="px-2 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50"
                          onClick={async () => { try { await refreshContent(selectedPage._id) } catch {} }}
                        >Capture content</button>
                      )}
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
                </div>
                <div className="bg-white border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">SEO Score</div>
                    <div className={`px-2 py-1 rounded text-sm ${
                      (selectedPage.seo?.seoScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                      (selectedPage.seo?.seoScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      (selectedPage.seo?.seoScore || 0) >= 40 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>{selectedPage.seo?.seoScore ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Focus keyword</div>
                    <FocusEditor page={selectedPage} onSave={updateFocusKeyword} />
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

function FocusEditor({ page, onSave }) {
  const [value, setValue] = useState(page?.seo?.focusKeyword || '')
  const [saving, setSaving] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <input
        className="px-3 py-1.5 border rounded w-56"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Focus keyword"
      />
      <button
        className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
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
