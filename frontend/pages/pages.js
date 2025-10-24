import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import useClientStore from '../store/clients'
import usePagesStore from '../store/pages'

export default function Pages() {
  const { clients, fetchClients } = useClientStore()
  const { pages, fetchPages, updateFocusKeyword, error, loading } = usePagesStore()
  const [clientId, setClientId] = useState('')

  useEffect(() => { fetchClients() }, [fetchClients])
  useEffect(() => { if (clientId) fetchPages(clientId) }, [clientId, fetchPages])

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
                    <tr key={p._id}>
                      <td className="px-4 py-3 text-sm text-blue-600 underline"><a href={p.url} target="_blank" rel="noreferrer">{p.url}</a></td>
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
                        <span className="text-xs text-gray-500">Updated {new Date(p.updatedAt).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
