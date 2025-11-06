import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/auth'
import useClientsStore from '../../store/clients'
import { 
  MagnifyingGlassCircleIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  ChartBarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function GoogleSearchConsole() {
  const router = useRouter()
  const { token } = useAuthStore()
  const { clients, fetchClients } = useClientsStore()
  const [selectedClient, setSelectedClient] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [dateRange, setDateRange] = useState('30days')

  useEffect(() => {
    if (token) {
      fetchClients(token)
    }
  }, [token])

  const fetchGSCData = async (clientId) => {
    if (!clientId) return
    
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      
      // Calculate start date based on range
      switch (dateRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30days':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90days':
          startDate.setDate(endDate.getDate() - 90)
          break
        default:
          startDate.setDate(endDate.getDate() - 30)
      }

      const formattedStart = startDate.toISOString().split('T')[0]
      const formattedEnd = endDate.toISOString().split('T')[0]

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/gsc/queries?startDate=${formattedStart}&endDate=${formattedEnd}`,
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
        toast.error(result.message || 'Failed to fetch Search Console data')
        setData(null)
      }
    } catch (err) {
      console.error('Error fetching GSC data:', err)
      toast.error('Failed to load Google Search Console data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId)
    setData(null)
    
    if (clientId) {
      // Check if client has GSC configured
      const client = clients.find(c => c._id === clientId)
      if (!client?.integrations?.gscSiteUrl) {
        toast.error('Google Search Console is not configured for this client')
        return
      }
      fetchGSCData(clientId)
    }
  }

  const handleDateRangeChange = (range) => {
    setDateRange(range)
    if (selectedClient) {
      fetchGSCData(selectedClient)
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toLocaleString() || '0'
  }

  const formatPercentage = (num) => {
    return `${num?.toFixed(1) || '0'}%`
  }

  const MetricCard = ({ title, value, change, icon: Icon, format = 'number' }) => {
    const isPositive = change >= 0
    const formattedValue = format === 'number' ? formatNumber(value) : 
                          format === 'percentage' ? formatPercentage(value) : value

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Icon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <ArrowTrendingUpIcon className="w-5 h-5" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MagnifyingGlassCircleIcon className="w-8 h-8 text-blue-600" />
              Google Search Console
            </h1>
            <p className="text-gray-600 mt-2">Monitor search performance and rankings</p>
          </div>
        </div>

        {/* Client Selector */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading search console data...</p>
            </div>
          </div>
        )}

        {/* Data Display */}
        {!loading && selectedClient && data && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Clicks"
                value={data.totalClicks || 0}
                change={data.clicksChange}
                icon={CursorArrowRaysIcon}
                format="number"
              />
              <MetricCard
                title="Total Impressions"
                value={data.totalImpressions || 0}
                change={data.impressionsChange}
                icon={EyeIcon}
                format="number"
              />
              <MetricCard
                title="Avg. CTR"
                value={data.averageCTR || 0}
                change={data.ctrChange}
                icon={ChartBarIcon}
                format="percentage"
              />
              <MetricCard
                title="Avg. Position"
                value={data.averagePosition?.toFixed(1) || 0}
                change={data.positionChange}
                icon={MapPinIcon}
              />
            </div>

            {/* Top Queries Table */}
            {data.queries && data.queries.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Queries</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Query</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Clicks</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Impressions</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CTR</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.queries.slice(0, 20).map((query, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">{query.query || query.keys?.[0]}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatNumber(query.clicks)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatNumber(query.impressions)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatPercentage(query.ctr * 100)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{query.position?.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Pages Table */}
            {data.pages && data.pages.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Page URL</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Clicks</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Impressions</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CTR</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pages.slice(0, 20).map((page, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900 truncate max-w-md">{page.page || page.keys?.[0]}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatNumber(page.clicks)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatNumber(page.impressions)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatPercentage(page.ctr * 100)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">{page.position?.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !selectedClient && (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <MagnifyingGlassCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
            <p className="text-gray-600">Choose a client to view their Google Search Console data</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && selectedClient && !data && (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <MagnifyingGlassCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Google Search Console may not be configured for this client</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
