import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import useAuthStore from '../../../store/auth'
import Link from 'next/link'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ArrowPathIcon,
  ChartBarIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  LinkIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowLeftIcon,
  CogIcon,
  DocumentChartBarIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

export default function ClientIntelligence() {
  const router = useRouter()
  const { id } = router.query
  const { token, user } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [intelligence, setIntelligence] = useState(null)
  const [trends, setTrends] = useState(null)
  const [aiInsights, setAiInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchIntelligence = useCallback(async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const [intResponse, trendResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/intelligence/client/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/intelligence/client/${id}/trends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const intData = await intResponse.json()
      const trendData = await trendResponse.json()

      if (intData.status === 'success') {
        setIntelligence(intData.data)
      } else {
        setError(intData.message || 'Failed to load intelligence')
      }

      if (trendData.status === 'success') {
        setTrends(trendData.data)
      }
    } catch (err) {
      console.error('Error fetching intelligence:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useEffect(() => {
    fetchIntelligence()
  }, [fetchIntelligence])

  const fetchAIInsights = async () => {
    try {
      setLoadingInsights(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/intelligence/client/${id}/insights`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await response.json()
      if (data.status === 'success') {
        setAiInsights(data.data)
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err)
    } finally {
      setLoadingInsights(false)
    }
  }

  const triggerSync = async () => {
    try {
      setSyncing(true)
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/intelligence/client/${id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setTimeout(() => {
        fetchIntelligence()
        setSyncing(false)
      }, 3000)
    } catch (err) {
      console.error('Sync error:', err)
      setSyncing(false)
    }
  }

  const TrendBadge = ({ value, inverse = false, label }) => {
    if (value === undefined || value === null) return null
    
    const isPositive = inverse ? value < 0 : value > 0
    const isNeutral = value === 0

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        isNeutral ? 'bg-gray-100 text-gray-600' :
        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {isNeutral ? (
          <MinusIcon className="h-3 w-3" />
        ) : isPositive ? (
          <ArrowUpIcon className="h-3 w-3" />
        ) : (
          <ArrowDownIcon className="h-3 w-3" />
        )}
        {Math.abs(value).toFixed(1)}%
        {label && <span className="text-gray-500 ml-1">{label}</span>}
      </div>
    )
  }

  const MetricCard = ({ title, value, icon: Icon, trend, trendLabel, color = 'blue', subtitle }) => (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 bg-${color}-100 rounded-lg`}>
          <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
        {trend !== undefined && <TrendBadge value={trend} label={trendLabel} />}
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )

  const IntegrationBadge = ({ connected, name }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {connected ? (
        <CheckCircleIcon className="h-4 w-4" />
      ) : (
        <MinusIcon className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">{name}</span>
    </div>
  )

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading client intelligence...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchIntelligence}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const client = intelligence?.client
  const analytics = intelligence?.analytics
  const searchConsole = intelligence?.searchConsole
  const googleBusiness = intelligence?.googleBusiness
  const rankings = intelligence?.rankings
  const backlinks = intelligence?.backlinks
  const seoHealth = intelligence?.seoHealth
  const trendSummary = trends?.summary?.trends

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/executive"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client?.name}</h1>
              <p className="text-gray-500">{client?.domain}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {(user?.role === 'Boss' || user?.role === 'Manager') && (
              <button
                onClick={triggerSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Data'}
              </button>
            )}
            <Link
              href={`/audits?client=${id}`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Run Audit
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {['overview', 'analytics', 'search', 'local', 'rankings', 'ai-insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* SEO Health Score */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">SEO Health Score</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-bold">{seoHealth?.score || 0}</span>
                    <span className="text-blue-200">/100</span>
                  </div>
                  <p className="text-blue-200 text-sm mt-2">
                    Last audit: {seoHealth?.lastAuditDate 
                      ? new Date(seoHealth.lastAuditDate).toLocaleDateString() 
                      : 'Never'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{seoHealth?.criticalIssues || 0}</p>
                      <p className="text-blue-200 text-xs">Critical</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{seoHealth?.highIssues || 0}</p>
                      <p className="text-blue-200 text-xs">High</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{seoHealth?.mediumIssues || 0}</p>
                      <p className="text-blue-200 text-xs">Medium</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{seoHealth?.lowIssues || 0}</p>
                      <p className="text-blue-200 text-xs">Low</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                title="Website Users"
                value={analytics?.users?.toLocaleString() || '—'}
                icon={GlobeAltIcon}
                trend={trendSummary?.traffic?.day7Change}
                trendLabel="7d"
                color="blue"
              />
              <MetricCard 
                title="Search Clicks"
                value={searchConsole?.clicks?.toLocaleString() || '—'}
                icon={MagnifyingGlassIcon}
                trend={trendSummary?.clicks?.day7Change}
                trendLabel="7d"
                color="green"
              />
              <MetricCard 
                title="GBP Views"
                value={googleBusiness?.views?.toLocaleString() || '—'}
                icon={MapPinIcon}
                trend={trendSummary?.localVisibility?.day7Change}
                trendLabel="7d"
                color="yellow"
              />
              <MetricCard 
                title="Backlinks"
                value={backlinks?.total || 0}
                icon={LinkIcon}
                color="purple"
                subtitle={`${backlinks?.live || 0} live`}
              />
            </div>

            {/* Integration Status */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Integration Status</h3>
              <div className="flex flex-wrap gap-3">
                <IntegrationBadge connected={intelligence?.integrations?.ga4} name="Google Analytics 4" />
                <IntegrationBadge connected={intelligence?.integrations?.gsc} name="Search Console" />
                <IntegrationBadge connected={intelligence?.integrations?.gbp} name="Business Profile" />
                <IntegrationBadge connected={intelligence?.integrations?.wordPressPlugin} name="WordPress Plugin" />
              </div>
            </div>

            {/* Keywords Summary */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Keywords Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{intelligence?.keywords?.primary || 0}</p>
                  <p className="text-sm text-gray-600">Primary</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{intelligence?.keywords?.secondary || 0}</p>
                  <p className="text-sm text-gray-600">Secondary</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{intelligence?.keywords?.seed || 0}</p>
                  <p className="text-sm text-gray-600">Seed</p>
                </div>
                <div className="text-center p-4 bg-gray-100 rounded-lg">
                  <p className="text-2xl font-bold text-gray-700">{intelligence?.keywords?.total || 0}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-6">Google Analytics 4</h3>
              
              {analytics ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Users</p>
                    <p className="text-xl font-bold text-gray-900">{analytics.users?.toLocaleString()}</p>
                    <TrendBadge value={trendSummary?.traffic?.day7Change} label="7d" />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">New Users</p>
                    <p className="text-xl font-bold text-gray-900">{analytics.newUsers?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Sessions</p>
                    <p className="text-xl font-bold text-gray-900">{analytics.sessions?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Pageviews</p>
                    <p className="text-xl font-bold text-gray-900">{analytics.pageviews?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Bounce Rate</p>
                    <p className="text-xl font-bold text-gray-900">{analytics.bounceRate}%</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <GlobeAltIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">GA4 not connected</p>
                  <Link href={`/clients/${id}/integrations`} className="text-blue-600 text-sm hover:underline">
                    Connect GA4 →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-6">Google Search Console</h3>
              
              {searchConsole ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Clicks</p>
                    <p className="text-xl font-bold text-gray-900">{searchConsole.clicks?.toLocaleString()}</p>
                    <TrendBadge value={trendSummary?.clicks?.day7Change} label="7d" />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Impressions</p>
                    <p className="text-xl font-bold text-gray-900">{searchConsole.impressions?.toLocaleString()}</p>
                    <TrendBadge value={trendSummary?.impressions?.day7Change} label="7d" />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">CTR</p>
                    <p className="text-xl font-bold text-gray-900">{searchConsole.ctr}%</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Avg Position</p>
                    <p className="text-xl font-bold text-gray-900">{searchConsole.avgPosition}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">GSC not connected</p>
                  <Link href={`/clients/${id}/integrations`} className="text-blue-600 text-sm hover:underline">
                    Connect GSC →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'local' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-6">Google Business Profile</h3>
              
              {googleBusiness ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Views</p>
                    <p className="text-xl font-bold text-gray-900">{googleBusiness.views?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Searches</p>
                    <p className="text-xl font-bold text-gray-900">{googleBusiness.searches?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Actions</p>
                    <p className="text-xl font-bold text-gray-900">{googleBusiness.actions?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Calls</p>
                    <p className="text-xl font-bold text-gray-900">{googleBusiness.calls?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Directions</p>
                    <p className="text-xl font-bold text-gray-900">{googleBusiness.directions?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Website Clicks</p>
                    <p className="text-xl font-bold text-gray-900">{googleBusiness.websiteClicks?.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">GBP not connected</p>
                  <Link href={`/clients/${id}/integrations`} className="text-blue-600 text-sm hover:underline">
                    Connect GBP →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rankings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-6">Keyword Rankings</h3>
              
              {rankings?.trackedKeywords > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Tracked</p>
                      <p className="text-xl font-bold text-gray-900">{rankings.trackedKeywords}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Avg Position</p>
                      <p className="text-xl font-bold text-gray-900">{rankings.avgPosition}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Top 3</p>
                      <p className="text-xl font-bold text-green-600">{rankings.top3Count}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Top 10</p>
                      <p className="text-xl font-bold text-blue-600">{rankings.top10Count}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Top 20</p>
                      <p className="text-xl font-bold text-yellow-600">{rankings.top20Count}</p>
                    </div>
                    <div className="p-4 bg-gray-100 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Top 100</p>
                      <p className="text-xl font-bold text-gray-600">{rankings.top100Count}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Not Ranking</p>
                      <p className="text-xl font-bold text-red-600">{rankings.notRanking}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowUpIcon className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-600">{rankings.movements?.improved || 0}</span>
                      <span className="text-gray-500 text-sm">Improved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowDownIcon className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-600">{rankings.movements?.declined || 0}</span>
                      <span className="text-gray-500 text-sm">Declined</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MinusIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-semibold text-gray-600">{rankings.movements?.unchanged || 0}</span>
                      <span className="text-gray-500 text-sm">Unchanged</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <KeyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No keywords tracked yet</p>
                  <Link href={`/keywords?client=${id}`} className="text-blue-600 text-sm hover:underline">
                    Add Keywords →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai-insights' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI-Powered Insights</h3>
                </div>
                <button
                  onClick={fetchAIInsights}
                  disabled={loadingInsights}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loadingInsights ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      Generate Insights
                    </>
                  )}
                </button>
              </div>

              {aiInsights ? (
                <div className="space-y-6">
                  {aiInsights.summary && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <h4 className="font-medium text-purple-900 mb-2">Executive Summary</h4>
                      <p className="text-gray-700">{aiInsights.summary}</p>
                    </div>
                  )}

                  {aiInsights.priorities?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Top Priorities</h4>
                      <div className="space-y-2">
                        {aiInsights.priorities.map((priority, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                            <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 text-sm font-bold">
                              {idx + 1}
                            </span>
                            <p className="text-gray-700">{priority}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiInsights.opportunities?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Opportunities</h4>
                      <div className="space-y-2">
                        {aiInsights.opportunities.map((opp, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700">{opp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiInsights.risks?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Risks</h4>
                      <div className="space-y-2">
                        {aiInsights.risks.map((risk, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700">{risk}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-right">
                    Generated: {new Date(aiInsights.generatedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Click "Generate Insights" to get AI-powered analysis</p>
                  <p className="text-sm text-gray-400 mt-1">Uses GPT-4 to analyze client data and provide recommendations</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
