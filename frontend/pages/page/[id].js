import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import usePagesStore from '../../store/pages'

export default function PageDetail() {
  const router = useRouter()
  const { id } = router.query
  const { pages, fetchPage, updateFocusKeyword, refreshContent } = usePagesStore()
  const [loading, setLoading] = useState(false)
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
            {page?.url && (
              <a className="text-sm text-blue-600 underline" href={page.url} target="_blank" rel="noreferrer">Open page</a>
            )}
          </div>
        </div>

        {(!page && loading) && (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        )}

        {page && (
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
            </div>
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <ScoreBadge value={page?.seo?.seoScore} />
              <div>
                <div className="text-xs text-gray-500 mb-1">Focus keyword</div>
                <FocusEditor page={page} onSave={updateFocusKeyword} />
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
        )}
      </div>
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
  const cls = v >= 80 ? 'bg-green-100 text-green-800' : v >= 60 ? 'bg-yellow-100 text-yellow-800' : v >= 40 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-600">SEO Score</div>
      <div className={`px-2 py-1 rounded text-sm ${cls}`}>{Number.isFinite(value) ? value : 'N/A'}</div>
    </div>
  )
}

function FocusEditor({ page, onSave }) {
  const [value, setValue] = useState(page?.seo?.focusKeyword || '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setValue(page?.seo?.focusKeyword || '') }, [page?._id])
  return (
    <div className="flex items-center gap-2">
      <input
        className="px-3 py-1.5 border rounded w-full"
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
