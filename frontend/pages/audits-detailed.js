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
  const [groupBy, setGroupBy] = useState('page') // 'page' | 'category'
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

  // Determine a priority bucket for a free-text issue description
  const categorizeIssueText = (text) => {
    if (!text) return 'Low'
    const t = String(text).toLowerCase()
    // Critical indicators
    if (/(broken|server error|5xx|4xx|404|timeout|redirect loop|failed to load)/.test(t)) return 'Critical'
    // High indicators
    if (/(noindex|blocked by robots|robots.txt|canonical(\s|$)|duplicate content|multiple h1|missing h1|no meta description|missing meta description)/.test(t)) return 'High'
    // Medium indicators
    if (/(missing alt|alt text|title too (long|short)|description too (long|short)|slow|large)/.test(t)) return 'Medium'
    return 'Low'
  }

  // Build unified list of issues for a page with priorities and deduplication
  const buildPageIssues = ({ analysis, meta, headings, images, page }) => {
    const items = []
    const seen = new Set()
    const pushIssue = (text, priority) => {
      const key = String(text || '').trim().toLowerCase()
      if (!key || seen.has(key)) return
      seen.add(key)
      items.push({ text, priority })
    }

    // Backend-provided issues
    const criticalList = analysis?.seoAnalysis?.criticalIssues || []
    criticalList.forEach(txt => pushIssue(txt, 'Critical'))

    const oppList = analysis?.seoAnalysis?.opportunities || []
    oppList.forEach(txt => pushIssue(txt, categorizeIssueText(txt)))

    // Synthetic issues from page data
    const h1Count = getHeadingCount(headings, 1)
    if (h1Count === 0) pushIssue('Missing H1 on page', 'High')
    if (h1Count > 1) pushIssue('Multiple H1 headings found', 'High')

    // Title/meta description heuristics
    const titleTooShort = meta?.title?.isTooShort
    const titleTooLong = meta?.title?.isTooLong
    if (titleTooShort) pushIssue('Title is too short (recommended 30-60 chars)', 'Low')
    if (titleTooLong) pushIssue('Title is too long and may be truncated', 'Low')

    const descText = meta?.description?.text || page?.metaDescription || ''
    if (!descText) pushIssue('Missing meta description', 'High')
    if (meta?.description?.isTooShort) pushIssue('Meta description is too short (recommended 120-160 chars)', 'Medium')
    if (meta?.description?.isTooLong) pushIssue('Meta description is too long and may be truncated', 'Medium')

    // Images without alt
    const missingAlt = images?.withoutAlt || 0
    if (missingAlt > 0) pushIssue(`${missingAlt} images missing alt text`, missingAlt >= 10 ? 'High' : 'Medium')

    // Include failing checks from computePageChecks (avoid duplicating on-page items we already add)
    try {
      const checks = computePageChecks({ page, analysis, meta, headings, images })
      const excludedGroups = new Set([
        'On-Page • Meta Tags',
        'On-Page • Headings',
        'On-Page • Content',
        'On-Page • Images',
      ])
      const mapPriority = (groupTitle, label) => {
        const g = groupTitle.toLowerCase()
        const l = String(label || '').toLowerCase()
        if (g.includes('security') || l.includes('https')) return 'Critical'
        if (g.includes('crawlability') || g.includes('indexing')) return 'High'
        if (g.includes('performance')) return 'Medium'
        if (g.includes('mobile')) return 'Medium'
        if (g.includes('links')) return l.includes('broken') ? 'High' : 'Medium'
        if (g.includes('schema')) return 'Medium'
        if (g.includes('off-page') || g.includes('ux')) return 'Low'
        if (g.includes('content & keyword')) return 'Low'
        return 'Low'
      }
      ;(checks.categories || []).forEach(cat => {
        if (excludedGroups.has(cat.title)) return
        ;(cat.items || []).forEach(it => {
          if (it.status === 'fail') {
            const text = `${it.label}${it.note ? ` (${it.note})` : ''}`
            pushIssue(text, mapPriority(cat.title, it.label))
          }
        })
      })
    } catch {}

    return items
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

  // Build page-level checks based on available data; returns { categories: [...], failCount }
  const computePageChecks = ({ page, analysis, meta, headings, images }) => {
    const checks = []
    let failCount = 0

    const push = (group, label, status, note) => {
      const grp = checks.find(g => g.title === group) || (() => { const g = { title: group, items: [] }; checks.push(g); return g })()
      grp.items.push({ label, status, note })
      if (status === 'fail') failCount += 1
    }

    // Helpers
    const isHttps = (url) => /^https:/i.test(url || '')
    const loadTimeMs = (() => {
      const v = page?.loadTime
      if (v == null) return undefined
      if (typeof v === 'number') return v
      const s = String(v).trim()
      const m = s.match(/([0-9]*\.?[0-9]+)/)
      if (!m) return undefined
      const num = parseFloat(m[1])
      return /s/i.test(s) ? num * 1000 : num
    })()
    const canonical = meta?.canonical || meta?.canonicalUrl || meta?.linkCanonical
    const robots = meta?.robots || {}
    const urlPath = (() => { try { const u = new URL(page?.url); return u.pathname || '/'; } catch { return String(page?.url || '/'); } })()
    const urlOk = (() => {
      const path = urlPath
      if (!path) return false
      // heuristic: lowercase, hyphen separated, short segments, avoid underscores and query
      const hasUnderscore = /_/ .test(path)
      const hasUpper = /[A-Z]/.test(path)
      const tooLong = path.length > 75
      const hasQuery = /[?]/.test(path)
      const goodHyphens = /\//.test(path) ? path.split('/').every(seg => seg.length === 0 || /^[a-z0-9-]+$/.test(seg)) : true
      return !hasUnderscore && !hasUpper && !tooLong && !hasQuery && goodHyphens
    })()

    // 1) Technical SEO Checks
    push('Technical • Crawlability & Indexing', 'Robots.txt present and configured', 'unknown')
    push('Technical • Crawlability & Indexing', 'XML sitemap exists and submitted', 'unknown')
    push('Technical • Crawlability & Indexing', 'Page is indexable (no noindex/canonical/disallow issues)', robots?.noindex ? 'fail' : 'pass')
    push('Technical • Crawlability & Indexing', 'Canonical tag correctly set', canonical ? 'pass' : 'fail')
    push('Technical • Crawlability & Indexing', 'Proper URL structure', urlOk ? 'pass' : 'fail')
    push('Technical • Crawlability & Indexing', 'No orphan pages (internally linked)', 'unknown')

    push('Technical • Performance', 'Core Web Vitals passing (mobile & desktop)', 'unknown')
    push('Technical • Performance', 'Fast page load (<2.5s)', typeof loadTimeMs === 'number' ? (loadTimeMs <= 2500 ? 'pass' : 'fail') : 'unknown', typeof loadTimeMs === 'number' ? `${Math.round(loadTimeMs)}ms` : undefined)
    push('Technical • Performance', 'Optimized images (WebP, compressed)', 'unknown')
    push('Technical • Performance', 'Minified CSS/JS, minimal render-blocking', 'unknown')
    push('Technical • Performance', 'Lazy load for below-the-fold images', 'unknown')
    push('Technical • Performance', 'Effective caching (browser & server)', 'unknown')

    push('Technical • Mobile Optimization', 'Mobile-friendly & responsive', 'unknown')
    push('Technical • Mobile Optimization', 'Touch elements well spaced', 'unknown')
    push('Technical • Mobile Optimization', 'Readable font sizes', 'unknown')
    push('Technical • Mobile Optimization', 'No viewport/overflow issues', 'unknown')

    push('Technical • Links', 'No broken links (404)', (page?.statusCode && page.statusCode !== 404) ? 'pass' : (page?.statusCode === 404 ? 'fail' : 'unknown'))
    push('Technical • Links', 'Internal linking logical', 'unknown')
    push('Technical • Links', 'External links target _blank and rel nofollow where needed', 'unknown')
    push('Technical • Links', 'Redirects configured; no chains', 'unknown')

    push('Technical • Security', 'HTTPS enabled', isHttps(page?.url) ? 'pass' : 'fail')
    push('Technical • Security', 'No mixed content', 'unknown')
    push('Technical • Security', 'Secure canonical URLs', canonical ? (isHttps(canonical) ? 'pass' : 'fail') : 'unknown')

    // 2) On-Page SEO Checks
    const titleLen = meta?.title?.text?.length ?? page?.title?.length ?? 0
    const descLen = meta?.description?.text?.length ?? page?.metaDescription?.length ?? 0
    push('On-Page • Meta Tags', 'Unique & descriptive Title (50–60 chars)', titleLen ? (titleLen >= 50 && titleLen <= 60 ? 'pass' : 'fail') : 'fail', `${titleLen} chars`)
    push('On-Page • Meta Tags', 'Compelling Meta description (120–160 chars)', descLen ? (descLen >= 120 && descLen <= 160 ? 'pass' : 'fail') : 'fail', `${descLen} chars`)
    push('On-Page • Meta Tags', 'Focus keyword in title & description', 'unknown')
    push('On-Page • Meta Tags', 'Proper use of meta robots', (robots && typeof robots === 'object') ? 'pass' : 'unknown')

    const h1Count = getHeadingCount(headings, 1)
    push('On-Page • Headings', 'Only one H1', h1Count === 1 ? 'pass' : 'fail', `H1 count: ${h1Count}`)
    // Hierarchy heuristic: levels do not jump by >1
    const headingLevels = (Array.isArray(headings?.headings) ? headings.headings : []).map(h => {
      let l = h?.level; if (typeof l === 'string') { const m = l.toLowerCase().match(/^h(\d)$/); if (m) l = parseInt(m[1], 10) }
      return typeof l === 'number' ? l : undefined
    }).filter(Boolean)
    const badJump = headingLevels.some((lvl, i, arr) => i > 0 && lvl - arr[i-1] > 1)
    push('On-Page • Headings', 'Proper heading hierarchy', headingLevels.length ? (badJump ? 'fail' : 'pass') : 'unknown')
    push('On-Page • Headings', 'Keywords used naturally in headings', 'unknown')

    const wordCount = analysis?.content?.wordCount
    push('On-Page • Content', 'No thin content (≥300 words)', typeof wordCount === 'number' ? (wordCount >= 300 ? 'pass' : 'fail') : 'unknown', typeof wordCount === 'number' ? `${wordCount} words` : undefined)
    push('On-Page • Content', 'Unique, high-quality, relevant', 'unknown')
    push('On-Page • Content', 'Keyword density 1–2% (natural)', 'unknown')
    push('On-Page • Content', 'Use of related (LSI) keywords', 'unknown')
    push('On-Page • Content', 'Internal links to related pages', 'unknown')
    push('On-Page • Content', 'Readable structure (short paras, bullets, headings)', 'unknown')

    const withoutAlt = images?.withoutAlt ?? 0
    push('On-Page • Images', 'Descriptive filenames', 'unknown')
    push('On-Page • Images', 'ALT text includes keyword contextually', withoutAlt === 0 ? 'pass' : 'fail', `${withoutAlt} missing alt`)
    push('On-Page • Images', 'Compressed and properly scaled', 'unknown')
    push('On-Page • Images', 'Lazy loading applied', 'unknown')

    push('On-Page • Schema', 'Structured data (JSON-LD) implemented', 'unknown')
    push('On-Page • Schema', 'Validated in Google Rich Results Test', 'unknown')

    // 3) Off-Page & UX – largely unknown at page-level
    push('Off-Page & UX • Backlinks', 'Healthy backlink profile (no toxic links)', 'unknown')
    push('Off-Page & UX • User Experience', 'Clear navigation, no intrusive popups, breadcrumbs', 'unknown')
    push('Off-Page & UX • Analytics', 'Analytics/Search Console/Conversions tracking', 'unknown')

    // 4) Content & Keyword Strategy – largely unknown
    push('Content & Keyword Strategy', 'Keyword mapping per page', 'unknown')
    push('Content & Keyword Strategy', 'Content updated/refreshed periodically', 'unknown')
    push('Content & Keyword Strategy', 'Use of FAQ/How-To schema where applicable', 'unknown')
    push('Content & Keyword Strategy', 'Avoid keyword cannibalization', 'unknown')

    return { categories: checks, failCount }
  }

  // Aggregate priority counts across all pages for summary cards
  const aggregatedPriority = useMemo(() => {
    const totals = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    const pages = audit?.results?.discoveredPages || []
    pages.forEach(p => {
      const analysis = getFromMap(lookups.analysisMap, p.url, audit.results?.pageAnalysis)
      const meta = getFromMap(lookups.metaMap, p.url, audit.results?.metaAnalysis)
      const headings = getFromMap(lookups.headingsMap, p.url, audit.results?.headingStructure)
      const images = getFromMap(lookups.imagesMap, p.url, audit.results?.imageAnalysis)
      const issues = buildPageIssues({ analysis, meta, headings, images, page: p })
      issues.forEach(it => { totals[it.priority] = (totals[it.priority] || 0) + 1 })
    })
    return totals
  }, [audit, lookups])

  // Aggregate categories and compute simple scores across all pages
  const aggregatedCategories = useMemo(() => {
    const totals = {}
    const pages = audit?.results?.discoveredPages || []
    pages.forEach(p => {
      const analysis = getFromMap(lookups.analysisMap, p.url, audit.results?.pageAnalysis)
      const meta = getFromMap(lookups.metaMap, p.url, audit.results?.metaAnalysis)
      const headings = getFromMap(lookups.headingsMap, p.url, audit.results?.headingStructure)
      const images = getFromMap(lookups.imagesMap, p.url, audit.results?.imageAnalysis)
      const checks = computePageChecks({ page: p, analysis, meta, headings, images })
      ;(checks.categories || []).forEach(cat => {
        if (!totals[cat.title]) totals[cat.title] = { pass: 0, fail: 0, unknown: 0 }
        cat.items.forEach(it => {
          totals[cat.title][it.status] = (totals[cat.title][it.status] || 0) + 1
        })
      })
    })

    // Compute section scores: Technical, On-Page, Performance
    const sectionMap = {
      Technical: ['Technical • Crawlability & Indexing','Technical • Performance','Technical • Mobile Optimization','Technical • Links','Technical • Security'],
      'On-Page': ['On-Page • Meta Tags','On-Page • Headings','On-Page • Content','On-Page • Images','On-Page • Schema'],
      Performance: ['Technical • Performance']
    }
    const sectionScores = {}
    Object.keys(sectionMap).forEach(sec => {
      const cats = sectionMap[sec]
      let pass=0, fail=0, unknown=0
      cats.forEach(c => { const t = totals[c]; if (t){ pass+=t.pass||0; fail+=t.fail||0; unknown+=t.unknown||0 }})
      const total = pass+fail+unknown
      const score = total>0 ? Math.max(0, Math.round(100 - (fail/(pass+fail+unknown))*100)) : null
      sectionScores[sec] = { score, pass, fail, unknown }
    })
    const overall = (()=>{
      const vals = Object.values(sectionScores).map(v=>v.score).filter(v=>typeof v==='number')
      const score = vals.length? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length): null
      return score
    })()

    return { totals, sectionScores, overall }
  }, [audit, lookups])

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
        {(
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-red-600 mb-2">{aggregatedPriority.Critical || 0}</div>
              <div className="text-sm font-semibold text-red-900">🔴 Critical Issues</div>
              <div className="text-xs text-red-600 mt-1">Immediate Action Required</div>
            </div>
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-orange-600 mb-2">{aggregatedPriority.High || 0}</div>
              <div className="text-sm font-semibold text-orange-900">🟠 High Priority</div>
              <div className="text-xs text-orange-600 mt-1">Address Soon</div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-yellow-600 mb-2">{aggregatedPriority.Medium || 0}</div>
              <div className="text-sm font-semibold text-yellow-900">🟡 Medium Priority</div>
              <div className="text-xs text-yellow-600 mt-1">Plan to Fix</div>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center shadow-lg">
              <div className="text-5xl font-bold text-green-600 mb-2">{aggregatedPriority.Low || 0}</div>
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

        {/* Site-level Checks (from backend signals) */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🧭 Site-level Checks</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Robots.txt */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">robots.txt</span>
                {Array.isArray(audit.results?.robotsTxtIssues) && audit.results.robotsTxtIssues.length === 0 ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 font-bold">PASS</span>
                ) : Array.isArray(audit.results?.robotsTxtIssues) ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 font-bold">{audit.results.robotsTxtIssues.length} ISSUES</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 font-bold">UNKNOWN</span>
                )}
              </div>
              <div className="text-sm text-gray-700">
                {Array.isArray(audit.results?.robotsTxtIssues) && audit.results.robotsTxtIssues.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {audit.results.robotsTxtIssues.slice(0,3).map((it, i) => (
                      <li key={i}>{it.issue || it.message || 'Issue'}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500">No problems detected or not evaluated.</span>
                )}
              </div>
            </div>

            {/* Sitemap */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">XML sitemap</span>
                {Array.isArray(audit.results?.sitemapIssues) && audit.results.sitemapIssues.length === 0 ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 font-bold">PASS</span>
                ) : Array.isArray(audit.results?.sitemapIssues) ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 font-bold">{audit.results.sitemapIssues.length} ISSUES</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 font-bold">UNKNOWN</span>
                )}
              </div>
              <div className="text-sm text-gray-700">
                {Array.isArray(audit.results?.sitemapIssues) && audit.results.sitemapIssues.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {audit.results.sitemapIssues.slice(0,3).map((it, i) => (
                      <li key={i}>{it.issue || it.message || 'Issue'}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500">No problems detected or not evaluated.</span>
                )}
              </div>
            </div>

            {/* Core Web Vitals (placeholder) */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">Core Web Vitals</span>
                {Array.isArray(audit.results?.coreWebVitals) && audit.results.coreWebVitals.length > 0 ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 font-bold">INFO</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 font-bold">UNKNOWN</span>
                )}
              </div>
              <div className="text-sm text-gray-700">
                {Array.isArray(audit.results?.coreWebVitals) && audit.results.coreWebVitals.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {audit.results.coreWebVitals.slice(0,3).map((it, i) => (
                      <li key={i}>{it.message || it.recommendation || it.type}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500">Integrate PageSpeed Insights API for detailed CWV metrics.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT - Ahrefs-style Interface */}
        {selectedPageIndex === null ? (
          /* ============ ALL PAGES VIEW ============ */
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Category Scores Summary */}
            <div className="bg-white p-6 border-b grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg p-4 bg-blue-50 border">
                <div className="text-xs text-blue-700 font-semibold">Technical SEO</div>
                <div className="text-3xl font-bold text-blue-900">{aggregatedCategories.sectionScores.Technical.score ?? 'N/A'}</div>
              </div>
              <div className="rounded-lg p-4 bg-purple-50 border">
                <div className="text-xs text-purple-700 font-semibold">On-Page SEO</div>
                <div className="text-3xl font-bold text-purple-900">{aggregatedCategories.sectionScores['On-Page'].score ?? 'N/A'}</div>
              </div>
              <div className="rounded-lg p-4 bg-amber-50 border">
                <div className="text-xs text-amber-700 font-semibold">Performance</div>
                <div className="text-3xl font-bold text-amber-900">{aggregatedCategories.sectionScores.Performance.score ?? 'N/A'}</div>
              </div>
              <div className="rounded-lg p-4 bg-gray-50 border">
                <div className="text-xs text-gray-700 font-semibold">Overall Score</div>
                <div className="text-3xl font-bold text-gray-900">{aggregatedCategories.overall ?? 'N/A'}</div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="bg-gray-50 border-b-2 border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <option value="has-issues">Has Issues</option>
                  <option value="has-failed-checks">Has Failed Checks</option>
                  <option value="critical">Priority: Critical</option>
                  <option value="high">Priority: High</option>
                  <option value="medium">Priority: Medium</option>
                  <option value="low">Priority: Low</option>
                  <option value="warnings">Warnings Only (High + Medium)</option>
                  <option value="info">Info Only (Low)</option>
                  <optgroup label="Failing Categories">
                    <option value="cat-tech-indexing">Technical • Crawlability & Indexing</option>
                    <option value="cat-tech-performance">Technical • Performance</option>
                    <option value="cat-onpage-meta">On-Page • Meta Tags</option>
                    <option value="cat-onpage-headings">On-Page • Headings</option>
                    <option value="cat-onpage-content">On-Page • Content</option>
                    <option value="cat-onpage-images">On-Page • Images</option>
                  </optgroup>
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
                  <option value="issues-asc">Fewest Issues First</option>
                </select>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white font-medium"
                >
                  <option value="page">Group by: Page</option>
                  <option value="category">Group by: Category</option>
                </select>
              </div>
            </div>

            {/* Main Content: Group by Page or Category */}
            {groupBy === 'category' ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Object.entries(aggregatedCategories.totals).map(([title, t]) => (
                    <div key={title} className="bg-white border rounded-lg shadow-sm p-4">
                      <div className="font-bold text-gray-900 mb-2">{title}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">PASS {t.pass||0}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">FAIL {t.fail||0}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">UNKNOWN {t.unknown||0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
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
                    let pages = audit.results?.discoveredPages?.map((page, index) => {
                      const analysis = getFromMap(lookups.analysisMap, page.url, audit.results?.pageAnalysis)
                      const meta = getFromMap(lookups.metaMap, page.url, audit.results?.metaAnalysis)
                      const headings = getFromMap(lookups.headingsMap, page.url, audit.results?.headingStructure)
                      const images = getFromMap(lookups.imagesMap, page.url, audit.results?.imageAnalysis)
                      const unifiedIssues = buildPageIssues({ analysis, meta, headings, images, page })
                      const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 }
                      unifiedIssues.forEach(it => { priorityCounts[it.priority] = (priorityCounts[it.priority] || 0) + 1 })
                      const checks = computePageChecks({ page, analysis, meta, headings, images })
                      const catFail = {}
                      ;(checks.categories || []).forEach(c => {
                        const fails = (c.items || []).filter(it => it.status === 'fail').length
                        if (fails > 0) catFail[c.title] = fails
                      })
                      return {
                        ...page,
                        originalIndex: index,
                        analysis,
                        meta,
                        headings,
                        images,
                        unifiedIssues,
                        priorityCounts,
                        checksFailCount: checks.failCount || 0,
                        checksFailedCategories: catFail,
                      }
                    }) || [];

                    // Filter
                    if (searchTerm) {
                      pages = pages.filter(p => 
                        p.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    }

                    if (filterBy === 'has-issues') pages = pages.filter(p => (p.unifiedIssues?.length || 0) > 0);
                    else if (filterBy === 'has-failed-checks') pages = pages.filter(p => (p.checksFailCount || 0) > 0);
                    else if (filterBy === 'critical') pages = pages.filter(p => (p.priorityCounts?.Critical || 0) > 0);
                    else if (filterBy === 'high') pages = pages.filter(p => (p.priorityCounts?.High || 0) > 0);
                    else if (filterBy === 'medium') pages = pages.filter(p => (p.priorityCounts?.Medium || 0) > 0);
                    else if (filterBy === 'low') pages = pages.filter(p => (p.priorityCounts?.Low || 0) > 0);
                    else if (filterBy === 'cat-tech-indexing') pages = pages.filter(p => p.checksFailedCategories?.['Technical • Crawlability & Indexing'] > 0);
                    else if (filterBy === 'cat-tech-performance') pages = pages.filter(p => p.checksFailedCategories?.['Technical • Performance'] > 0);
                    else if (filterBy === 'cat-onpage-meta') pages = pages.filter(p => p.checksFailedCategories?.['On-Page • Meta Tags'] > 0);
                    else if (filterBy === 'cat-onpage-headings') pages = pages.filter(p => p.checksFailedCategories?.['On-Page • Headings'] > 0);
                    else if (filterBy === 'cat-onpage-content') pages = pages.filter(p => p.checksFailedCategories?.['On-Page • Content'] > 0);
                    else if (filterBy === 'cat-onpage-images') pages = pages.filter(p => p.checksFailedCategories?.['On-Page • Images'] > 0);
                    else if (filterBy === 'warnings') pages = pages.filter(p => ((p.priorityCounts?.High || 0) + (p.priorityCounts?.Medium || 0)) > 0 && (p.priorityCounts?.Critical || 0) === 0);
                    else if (filterBy === 'info') pages = pages.filter(p => (p.priorityCounts?.Low || 0) > 0 && ((p.priorityCounts?.Critical || 0) + (p.priorityCounts?.High || 0) + (p.priorityCounts?.Medium || 0)) === 0);
                    else if (filterBy === 'good') pages = pages.filter(p => (p.analysis?.seoAnalysis?.seoScore || 0) >= 80);
                    else if (filterBy === 'needs-work') pages = pages.filter(p => (p.analysis?.seoAnalysis?.seoScore || 0) < 60);

                    // Sort
                    if (sortBy === 'score-desc') pages.sort((a, b) => (b.analysis?.seoAnalysis?.seoScore || 0) - (a.analysis?.seoAnalysis?.seoScore || 0));
                    else if (sortBy === 'score-asc') pages.sort((a, b) => (a.analysis?.seoAnalysis?.seoScore || 0) - (b.analysis?.seoAnalysis?.seoScore || 0));
                    else if (sortBy === 'issues-desc') {
                      pages.sort((a, b) => {
                        const aIssues = (a.unifiedIssues?.length || 0)
                        const bIssues = (b.unifiedIssues?.length || 0)
                        return bIssues - aIssues;
                      });
                    } else if (sortBy === 'issues-asc') {
                      pages.sort((a, b) => {
                        const aIssues = (a.unifiedIssues?.length || 0)
                        const bIssues = (b.unifiedIssues?.length || 0)
                        return aIssues - bIssues;
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
                      const allIssues = page.unifiedIssues || [];
                      const totalIssues = allIssues.length;
                      
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
                                        {(() => {
                                          const grouped = { Critical: [], High: [], Medium: [], Low: [] }
                                          allIssues.forEach(it => { (grouped[it.priority] || grouped.Low).push(it) })
                                          const sections = [
                                            { key: 'Critical', title: '🔴 Critical', colorClass: 'text-red-700', dot: 'bg-red-500' },
                                            { key: 'High', title: '🟠 High', colorClass: 'text-orange-700', dot: 'bg-orange-500' },
                                            { key: 'Medium', title: '🟡 Medium', colorClass: 'text-yellow-700', dot: 'bg-yellow-500' },
                                            { key: 'Low', title: '🟢 Low', colorClass: 'text-green-700', dot: 'bg-green-500' },
                                          ]
                                          return sections.map(sec => (
                                            grouped[sec.key].length > 0 ? (
                                              <div key={sec.key}>
                                                <div className={`text-sm font-bold mb-1 ${sec.colorClass}`}>{sec.title} ({grouped[sec.key].length})</div>
                                                <ul className="space-y-1 text-sm">
                                                  {grouped[sec.key].map((it, i) => (
                                                    <li key={`${sec.key}-${i}`} className="flex items-center gap-2">
                                                      <span className={`inline-block w-2 h-2 rounded-full ${sec.dot}`}></span>
                                                      <span className="text-gray-800">{it.text}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            ) : null
                                          ))
                                        })()}
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
            )}
          </div>
        ) : (
          /* ============ SINGLE PAGE DETAIL VIEW ============ */
          (() => {
            const page = audit.results?.discoveredPages[selectedPageIndex];
            const analysis = getFromMap(lookups.analysisMap, page?.url, audit.results?.pageAnalysis);
            const meta = getFromMap(lookups.metaMap, page?.url, audit.results?.metaAnalysis);
            const headings = getFromMap(lookups.headingsMap, page?.url, audit.results?.headingStructure);
            const images = getFromMap(lookups.imagesMap, page?.url, audit.results?.imageAnalysis);
            const unifiedIssues = buildPageIssues({ analysis, meta, headings, images, page })

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
                      <div className={`text-2xl font-bold ${unifiedIssues.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{unifiedIssues.length}</div>
                      <div className="text-xs text-gray-600">Issues</div>
                    </div>
                  </div>
                </div>

                {/* Tabs + Checks Summary Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="flex border-b">
                    {[ 
                      { id: 'overview', label: 'Overview', count: null },
                      { id: 'issues', label: 'Issues', count: unifiedIssues.length },
                      { id: 'meta', label: 'Meta Tags', count: null },
                      { id: 'headings', label: 'Headings', count: headings?.headings?.length || 0 },
                      { id: 'images', label: 'Images', count: images?.totalImages || 0 },
                      { id: 'checks', label: 'Checks', count: (() => computePageChecks({ page, analysis, meta, headings, images }).failCount)() },
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
                        {unifiedIssues.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="text-6xl mb-3">🎉</div>
                            <div className="text-xl font-bold text-gray-700">No issues found!</div>
                            <div className="text-gray-500">This page looks great.</div>
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const grouped = { Critical: [], High: [], Medium: [], Low: [] }
                              unifiedIssues.forEach(it => { (grouped[it.priority] || grouped.Low).push(it) })
                              const sections = [
                                { key: 'Critical', title: '🔴 Critical Issues', wrapper: 'bg-red-50 border-l-4 border-red-500', badge: 'bg-red-600 text-white' },
                                { key: 'High', title: '🟠 High Priority', wrapper: 'bg-orange-50 border-l-4 border-orange-500', badge: 'bg-orange-600 text-white' },
                                { key: 'Medium', title: '🟡 Medium Priority', wrapper: 'bg-yellow-50 border-l-4 border-yellow-500', badge: 'bg-yellow-500 text-black' },
                                { key: 'Low', title: '🟢 Low Priority', wrapper: 'bg-green-50 border-l-4 border-green-500', badge: 'bg-green-600 text-white' },
                              ]
                              return sections.map(sec => (
                                grouped[sec.key].length > 0 ? (
                                  <div key={sec.key} className={`${sec.wrapper} p-6 rounded`}>
                                    <h4 className="font-bold mb-4 text-lg flex items-center gap-2">
                                      {sec.title}
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${sec.badge}`}>{grouped[sec.key].length}</span>
                                    </h4>
                                    <ul className="space-y-3">
                                      {grouped[sec.key].map((it, idx) => (
                                        <li key={`${sec.key}-${idx}`} className="flex gap-3 bg-white p-4 rounded shadow-sm">
                                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${sec.badge}`}>{sec.key}</span>
                                          <span className="text-gray-900">{it.text}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null
                              ))
                            })()}

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

                    {/* Checks Tab */}
                    {activeTab === 'checks' && (() => {
                      const { categories, failCount } = computePageChecks({ page, analysis, meta, headings, images })
                      return (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between bg-gray-50 p-4 rounded">
                            <div className="text-sm text-gray-700">Automated checks based on available crawl/meta data. Many items may be Unknown without site-wide metrics.</div>
                            <div className="text-sm font-semibold">
                              <span className="mr-3">Fails: <span className="text-red-600">{failCount}</span></span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {categories.map((cat, idx) => (
                              <div key={idx} className="bg-white border rounded-lg shadow-sm">
                                <div className="px-4 py-3 border-b font-bold text-gray-900">{cat.title}</div>
                                <ul className="divide-y">
                                  {cat.items.map((it, i) => (
                                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                                      <span className={`mt-1 px-2 py-0.5 rounded text-xs font-bold ${
                                        it.status === 'pass' ? 'bg-green-100 text-green-800' : it.status === 'fail' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {it.status === 'pass' ? 'PASS' : it.status === 'fail' ? 'FAIL' : 'UNKNOWN'}
                                      </span>
                                      <div className="flex-1">
                                        <div className="text-gray-900 font-medium">{it.label}</div>
                                        {it.note && <div className="text-xs text-gray-500 mt-0.5">{it.note}</div>}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>

                          <div className="text-xs text-gray-500">Legend: PASS = criteria met, FAIL = needs attention, UNKNOWN = not evaluated from current dataset.</div>
                        </div>
                      )
                    })()}
                    </div>
                  </div>

                  {/* Compact Checks Summary Sidebar */}
                  <div className="lg:col-span-1">
                    {(() => {
                      const { categories } = computePageChecks({ page, analysis, meta, headings, images })
                      let pass = 0, fail = 0, unknown = 0
                      categories.forEach(c => c.items.forEach(it => {
                        if (it.status === 'pass') pass++
                        else if (it.status === 'fail') fail++
                        else unknown++
                      }))
                      return (
                        <div className="bg-white rounded-xl shadow-lg p-4 border sticky top-6">
                          <div className="font-bold text-gray-900 mb-3">Checks Summary</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">PASS</span>
                              <span className="font-semibold text-gray-900">{pass}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">FAIL</span>
                              <span className="font-semibold text-gray-900">{fail}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">UNKNOWN</span>
                              <span className="font-semibold text-gray-900">{unknown}</span>
                            </div>
                          </div>
                          <div className="mt-4 text-xs text-gray-500">Computed from current page’s available signals.</div>
                        </div>
                      )
                    })()}
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

