import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/auth'
import useClientsStore from '../../store/clients'
import { 
  BuildingStorefrontIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  PhoneIcon,
  MapPinIcon,
  StarIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function GoogleBusinessProfile() {
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

  const fetchGBPData = async (clientId) => {
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
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/gbp/insights?startDate=${formattedStart}&endDate=${formattedEnd}`,
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
        toast.error(result.message || 'Failed to fetch Business Profile data')
        setData(null)
      }
    } catch (err) {
      console.error('Error fetching GBP data:', err)
      toast.error('Failed to load Google Business Profile data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId)
    setData(null)
    
    if (clientId) {
      // Check if client has GBP configured
      const client = clients.find(c => c._id === clientId)
      if (!client?.integrations?.gbpAccountId) {
        toast.error('Google Business Profile is not configured for this client')
        return
      }
      fetchGBPData(clientId)
    }
  }

  const handleDateRangeChange = (range) => {
    setDateRange(range)
    if (selectedClient) {
      fetchGBPData(selectedClient)
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
            <div className="p-3 bg-green-100 rounded-lg">
              <Icon className="w-6 h-6 text-green-600" />
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
              <BuildingStorefrontIcon className="w-8 h-8 text-green-600" />
              Google Business Profile
            </h1>
            <p className="text-gray-600 mt-2">Monitor local business performance and customer interactions</p>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              <p className="text-gray-600 mt-4">Loading business profile data...</p>
            </div>
          </div>
        )}

        {/* Data Display */}
        {!loading && selectedClient && data && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Profile Views"
                value={data.totalViews || 0}
                change={data.viewsChange}
                icon={EyeIcon}
                format="number"
              />
              <MetricCard
                title="Search Views"
                value={data.searchViews || 0}
                change={data.searchViewsChange}
                icon={MapPinIcon}
                format="number"
              />
              <MetricCard
                title="Phone Calls"
                value={data.phoneCalls || 0}
                change={data.callsChange}
                icon={PhoneIcon}
                format="number"
              />
              <MetricCard
                title="Average Rating"
                value={data.averageRating?.toFixed(1) || '0.0'}
                change={data.ratingChange}
                icon={StarIcon}
              />
            </div>

            {/* Customer Actions */}
            {data.actions && data.actions.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.actions.map((action, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">{action.name || action.type}</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(action.count || action.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Reviews */}
            {data.reviews && data.reviews.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
                <div className="space-y-4">
                  {data.reviews.slice(0, 5).map((review, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{review.reviewer?.displayName || 'Anonymous'}</p>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (review.starRating || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {review.createTime ? new Date(review.createTime).toLocaleDateString() : ''}
                        </p>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-700">{review.comment}</p>
                      )}
                      {review.reviewReply?.comment && (
                        <div className="mt-3 pl-4 border-l-2 border-green-500">
                          <p className="text-sm font-medium text-gray-900 mb-1">Response:</p>
                          <p className="text-sm text-gray-700">{review.reviewReply.comment}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Queries */}
            {data.searchQueries && data.searchQueries.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Search Queries</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Query</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Impressions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.searchQueries.slice(0, 10).map((query, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">{query.query || query.searchTerm}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right">
                            {formatNumber(query.impressions || query.count)}
                          </td>
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
            <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
            <p className="text-gray-600">Choose a client to view their Google Business Profile data</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && selectedClient && !data && (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Google Business Profile may not be configured for this client</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
