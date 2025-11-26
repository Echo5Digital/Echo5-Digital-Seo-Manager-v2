import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/auth'
import Link from 'next/link'
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  MinusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowPathIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

export default function ExecutiveDashboard() {
  const { user, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/intelligence/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        setOverview(data.data)
      } else {
        setError(data.message || 'Failed to load overview')
      }
    } catch (err) {
      console.error('Error fetching overview:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const triggerSync = async () => {
    try {
      setSyncing(true)
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/intelligence/sync-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      // Refresh after a delay
      setTimeout(() => {
        fetchOverview()
        setSyncing(false)
      }, 3000)
    } catch (err) {
      console.error('Sync error:', err)
      setSyncing(false)
    }
  }

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getHealthBgColor = (score) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const TrendIndicator = ({ value, inverse = false }) => {
    if (value === 0 || value === undefined) {
      return <MinusIcon className="h-4 w-4 text-gray-400" />
    }
    
    const isPositive = inverse ? value < 0 : value > 0
    
    return (
      <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpIcon className="h-4 w-4 mr-1" />
        ) : (
          <ArrowDownIcon className="h-4 w-4 mr-1" />
        )}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading intelligence data...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
            <p className="text-gray-600 mt-1">AI-powered SEO intelligence overview</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'Boss' && (
              <button
                onClick={triggerSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <ArrowPathIcon className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync All Data'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.totalClients || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg SEO Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.avgSEOScore || 0}</p>
              </div>
              <div className={`p-3 rounded-lg ${getHealthColor(overview?.avgSEOScore || 0)}`}>
                <ChartBarIcon className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Needs Attention</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.clientsNeedingAttention || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">AI Insights</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">Active</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Client Health Matrix */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Client Health Matrix</h2>
                <p className="text-sm text-gray-500 mt-1">SEO health scores for all clients</p>
              </div>
              <Link href="/clients" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {overview?.clients?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview.clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}/intelligence`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{client.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{client.domain}</p>
                      </div>
                      <div className={`ml-3 px-2 py-1 rounded-full text-sm font-semibold ${getHealthColor(client.seoScore)}`}>
                        {client.seoScore}
                      </div>
                    </div>
                    
                    {/* Health bar */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full rounded-full transition-all ${getHealthBgColor(client.seoScore)}`}
                        style={{ width: `${client.seoScore}%` }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-gray-500">Users</p>
                        <p className="font-semibold text-gray-900">{client.users?.toLocaleString() || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-gray-500">Clicks</p>
                        <p className="font-semibold text-gray-900">{client.clicks?.toLocaleString() || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-gray-500">Issues</p>
                        <p className={`font-semibold ${client.criticalIssues > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {client.criticalIssues || 0}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <GlobeAltIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No clients with data yet</p>
                <p className="text-sm text-gray-400 mt-1">Run audits and sync data to see insights</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & AI Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                href="/audits"
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-colors"
              >
                <div className="p-2 bg-blue-600 rounded-lg">
                  <MagnifyingGlassIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Run New Audit</p>
                  <p className="text-sm text-gray-600">Analyze a client's SEO health</p>
                </div>
              </Link>
              
              <Link 
                href="/tasks"
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-colors"
              >
                <div className="p-2 bg-green-600 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Tasks</p>
                  <p className="text-sm text-gray-600">Manage SEO tasks and assignments</p>
                </div>
              </Link>
              
              <Link 
                href="/reports"
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-colors"
              >
                <div className="p-2 bg-purple-600 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Generate Reports</p>
                  <p className="text-sm text-gray-600">Create client performance reports</p>
                </div>
              </Link>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">AI Recommendations</h2>
            </div>
            
            {overview?.clients?.filter(c => c.criticalIssues > 0 || c.seoScore < 50).length > 0 ? (
              <div className="space-y-3">
                {overview.clients
                  .filter(c => c.criticalIssues > 0 || c.seoScore < 50)
                  .slice(0, 3)
                  .map((client, idx) => (
                    <div key={client.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="p-1 bg-amber-200 rounded-full">
                        <BoltIcon className="h-4 w-4 text-amber-700" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                        <p className="text-sm text-gray-600">
                          {client.criticalIssues > 0 
                            ? `${client.criticalIssues} critical issues need immediate attention`
                            : `SEO score (${client.seoScore}) is below threshold`}
                        </p>
                        <Link 
                          href={`/clients/${client.id}/intelligence`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 inline-block"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">All clients are healthy!</p>
                <p className="text-sm text-gray-500 mt-1">No urgent recommendations at this time</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
