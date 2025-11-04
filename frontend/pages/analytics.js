import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import useAuthStore from '../store/auth'
import useClientsStore from '../store/clients'
import { ChartBarIcon, MagnifyingGlassCircleIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'

export default function Analytics() {
  const { token } = useAuthStore()
  const { clients, fetchClients } = useClientsStore()
  const [selectedClient, setSelectedClient] = useState('')
  const [activeTab, setActiveTab] = useState('ga4')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      fetchClients(token)
    }
  }, [token])

  const fetchGA4Data = async (clientId) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/ga4/overview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      if (result.status === 'success') {
        setData(result.data)
      } else {
        setError(result.message || 'Failed to fetch GA4 data')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGSCData = async (clientId) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/gsc/queries`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      if (result.status === 'success') {
        setData(result.data)
      } else {
        setError(result.message || 'Failed to fetch GSC data')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGBPData = async (clientId) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/gbp/insights`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      if (result.status === 'success') {
        setData(result.data)
      } else {
        setError(result.message || 'Failed to fetch GBP data')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId)
    setData(null)
    setError(null)
    
    if (clientId && activeTab === 'ga4') {
      fetchGA4Data(clientId)
    } else if (clientId && activeTab === 'gsc') {
      fetchGSCData(clientId)
    } else if (clientId && activeTab === 'gbp') {
      fetchGBPData(clientId)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setData(null)
    setError(null)
    
    if (selectedClient) {
      if (tab === 'ga4') {
        fetchGA4Data(selectedClient)
      } else if (tab === 'gsc') {
        fetchGSCData(selectedClient)
      } else if (tab === 'gbp') {
        fetchGBPData(selectedClient)
      }
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">View GA4, Google Search Console, and Google Business Profile insights</p>
        </div>

        {/* Client Selector */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Client
          </label>
          <select
            value={selectedClient}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Choose a client...</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClient && (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => handleTabChange('ga4')}
                    className={`${
                      activeTab === 'ga4'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors`}
                  >
                    <ChartBarIcon className="w-5 h-5" />
                    Google Analytics 4
                  </button>
                  <button
                    onClick={() => handleTabChange('gsc')}
                    className={`${
                      activeTab === 'gsc'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors`}
                  >
                    <MagnifyingGlassCircleIcon className="w-5 h-5" />
                    Search Console
                  </button>
                  <button
                    onClick={() => handleTabChange('gbp')}
                    className={`${
                      activeTab === 'gbp'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors`}
                  >
                    <BuildingStorefrontIcon className="w-5 h-5" />
                    Business Profile
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {loading && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Loading data...</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                    <p className="text-sm text-red-600 mt-2">
                      Make sure the client has this integration configured in their settings.
                    </p>
                  </div>
                )}

                {!loading && !error && !data && (
                  <div className="text-center py-12 text-gray-500">
                    <p>Select a client to view analytics data</p>
                  </div>
                )}

                {!loading && !error && data && activeTab === 'ga4' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">GA4 Overview (Last 30 Days)</h3>
                    
                    {data.metrics && data.metrics.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-600 font-medium">Total Users</p>
                          <p className="text-3xl font-bold text-blue-900 mt-2">
                            {parseInt(data.metrics[0]?.value || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                          <p className="text-sm text-green-600 font-medium">Sessions</p>
                          <p className="text-3xl font-bold text-green-900 mt-2">
                            {parseInt(data.metrics[1]?.value || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-600 font-medium">Engaged Sessions</p>
                          <p className="text-3xl font-bold text-purple-900 mt-2">
                            {parseInt(data.metrics[2]?.value || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-600 font-medium">Avg. Session Duration</p>
                          <p className="text-3xl font-bold text-yellow-900 mt-2">
                            {Math.round(parseFloat(data.metrics[3]?.value || 0))}s
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                          <p className="text-sm text-red-600 font-medium">Bounce Rate</p>
                          <p className="text-3xl font-bold text-red-900 mt-2">
                            {(parseFloat(data.metrics[4]?.value || 0) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200">
                          <p className="text-sm text-indigo-600 font-medium">Conversions</p>
                          <p className="text-3xl font-bold text-indigo-900 mt-2">
                            {parseInt(data.metrics[5]?.value || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!loading && !error && data && activeTab === 'gsc' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Top Search Queries (Last 30 Days)</h3>
                    
                    {data.queries && data.queries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Query</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impressions</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.queries.slice(0, 50).map((query, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-900">{query.keys[0]}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{query.clicks}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{query.impressions}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{(query.ctr * 100).toFixed(2)}%</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{query.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500">No query data available</p>
                    )}
                  </div>
                )}

                {!loading && !error && data && activeTab === 'gbp' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Business Profile Insights</h3>
                    
                    {data.insights ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <p className="text-sm text-blue-800">
                          GBP metrics data retrieved. Detailed charts and metrics will be displayed here.
                        </p>
                        <pre className="mt-4 text-xs text-gray-700 overflow-auto max-h-96">
                          {JSON.stringify(data.insights, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-gray-500">No GBP data available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!selectedClient && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-8 text-center">
            <ChartBarIcon className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started with Analytics</h3>
            <p className="text-gray-600">
              Select a client above to view their Google Analytics, Search Console, and Business Profile data.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
