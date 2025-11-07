import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/auth'
import useClientsStore from '../../store/clients'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  UsersIcon,
  EyeIcon,
  ClockIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  BoltIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline'
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, 
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import jsPDF from 'jspdf'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export default function GoogleAnalytics() {
  const router = useRouter()
  const { token } = useAuthStore()
  const { clients, fetchClients } = useClientsStore()
  const [selectedClient, setSelectedClient] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [timeSeriesData, setTimeSeriesData] = useState([])
  const [trafficSources, setTrafficSources] = useState([])
  const [deviceData, setDeviceData] = useState([])
  const [realTimeUsers, setRealTimeUsers] = useState(0)
  const [realTimeLast30Min, setRealTimeLast30Min] = useState(0)
  const [realTimeLast5Min, setRealTimeLast5Min] = useState(0)
  const [realTimeMinuteData, setRealTimeMinuteData] = useState([])
  const [realTimePages, setRealTimePages] = useState([])
  const [realTimeSources, setRealTimeSources] = useState([])
  const [realTimeEvents, setRealTimeEvents] = useState([])
  const [dateRange, setDateRange] = useState('30days')
  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparisonData, setComparisonData] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    if (token) {
      fetchClients(token)
    }
  }, [token])

  const fetchGA4Data = async (clientId) => {
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

      // Fetch all data in parallel
      const [overview, timeseries, traffic, devices, realtime] = await Promise.allSettled([
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/ga4/overview?startDate=${formattedStart}&endDate=${formattedEnd}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.json()),
        
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/ga4/timeseries?startDate=${formattedStart}&endDate=${formattedEnd}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.json()),
        
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/ga4/traffic-sources?startDate=${formattedStart}&endDate=${formattedEnd}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.json()),
        
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/ga4/devices?startDate=${formattedStart}&endDate=${formattedEnd}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.json()),
        
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/ga4/realtime`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.json())
      ])

      if (overview.status === 'fulfilled' && overview.value.status === 'success') {
        setData(overview.value.data)
      }

      if (timeseries.status === 'fulfilled' && timeseries.value.status === 'success') {
        setTimeSeriesData(timeseries.value.data || [])
      }

      if (traffic.status === 'fulfilled' && traffic.value.status === 'success') {
        setTrafficSources(traffic.value.data || [])
      }

      if (devices.status === 'fulfilled' && devices.value.status === 'success') {
        setDeviceData(devices.value.data || [])
      }

      if (realtime.status === 'fulfilled' && realtime.value.status === 'success') {
        console.log('Real-time data received:', realtime.value.data)
        setRealTimeUsers(realtime.value.data?.lastMinute || 0)
        setRealTimeLast30Min(realtime.value.data?.last30Min || 0)
        setRealTimeLast5Min(realtime.value.data?.last5Min || 0)
        setRealTimeMinuteData(realtime.value.data?.minuteData || [])
        setRealTimePages(realtime.value.data?.activePages || [])
        setRealTimeSources(realtime.value.data?.activeSources || [])
        setRealTimeEvents(realtime.value.data?.activeEvents || [])
      } else if (realtime.status === 'fulfilled') {
        console.log('Real-time fetch succeeded but status not success:', realtime.value)
      } else {
        console.log('Real-time fetch failed:', realtime.reason)
      }

      // Fetch comparison data if enabled
      if (comparisonMode) {
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        const compStartDate = new Date(startDate)
        compStartDate.setDate(compStartDate.getDate() - days)
        const compEndDate = new Date(startDate)
        compEndDate.setDate(compEndDate.getDate() - 1)

        const compFormatStart = compStartDate.toISOString().split('T')[0]
        const compFormatEnd = compEndDate.toISOString().split('T')[0]

        const compResult = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${clientId}/ga4/overview?startDate=${compFormatStart}&endDate=${compFormatEnd}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.json())

        if (compResult.status === 'success') {
          setComparisonData(compResult.data)
        }
      }
    } catch (err) {
      console.error('Error fetching GA4 data:', err)
      toast.error('Failed to load Google Analytics data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId)
    setData(null)
    
    if (clientId) {
      // Check if client has GA4 configured
      const client = clients.find(c => c._id === clientId)
      if (!client?.integrations?.ga4PropertyId) {
        toast.error('Google Analytics 4 is not configured for this client')
        return
      }
      fetchGA4Data(clientId)
    }
  }

  const handleDateRangeChange = (range) => {
    setDateRange(range)
  }

  // Fetch data when client or date range changes
  useEffect(() => {
    if (selectedClient) {
      fetchGA4Data(selectedClient)
    }
  }, [selectedClient, dateRange, comparisonMode])

  // Real-time auto-refresh
  useEffect(() => {
    if (!selectedClient) return
    
    const interval = setInterval(() => {
      if (activeTab === 'realtime') {
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${selectedClient}/ga4/realtime`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .then(r => r.json())
        .then(result => {
          console.log('Real-time refresh result:', result)
          if (result.status === 'success') {
            setRealTimeUsers(result.data?.lastMinute || 0)
            setRealTimeLast30Min(result.data?.last30Min || 0)
            setRealTimeLast5Min(result.data?.last5Min || 0)
            setRealTimeMinuteData(result.data?.minuteData || [])
            setRealTimePages(result.data?.activePages || [])
            setRealTimeSources(result.data?.activeSources || [])
            setRealTimeEvents(result.data?.activeEvents || [])
          }
        })
        .catch((err) => {
          console.error('Real-time refresh error:', err)
        })
      }
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [selectedClient, activeTab, token])

  const handleRefresh = () => {
    if (selectedClient) {
      fetchGA4Data(selectedClient)
      toast.success('Data refreshed')
    }
  }

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  // Export to CSV
  const exportToCSV = () => {
    if (!data?.topPages) {
      toast.error('No data to export')
      return
    }
    
    const headers = ['Page Path', 'Views', 'Users', 'Sessions']
    const rows = data.topPages.map(page => [
      page.pagePath || page.path || '/',
      page.views || page.screenPageViews || 0,
      page.users || page.totalUsers || 0,
      page.sessions || 0
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ga4-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    toast.success('Report exported to CSV')
  }

  // Export to PDF
  const exportToPDF = () => {
    if (!data) {
      toast.error('No data to export')
      return
    }
    
    const doc = new jsPDF()
    const client = clients.find(c => c._id === selectedClient)
    
    doc.setFontSize(20)
    doc.text('Google Analytics 4 Report', 20, 20)
    doc.setFontSize(12)
    doc.text(`Client: ${client?.name || 'N/A'}`, 20, 30)
    doc.text(`Date: ${format(new Date(), 'MMMM dd, yyyy')}`, 20, 37)
    doc.text(`Period: ${dateRange}`, 20, 44)
    
    doc.setFontSize(14)
    doc.text('Key Metrics', 20, 60)
    doc.setFontSize(10)
    doc.text(`Total Users: ${formatNumber(data.totalUsers || 0)}`, 30, 70)
    doc.text(`Page Views: ${formatNumber(data.screenPageViews || 0)}`, 30, 77)
    doc.text(`Sessions: ${formatNumber(data.sessions || 0)}`, 30, 84)
    doc.text(`Bounce Rate: ${formatPercentage(data.bounceRate || 0)}`, 30, 91)
    doc.text(`Avg Session Duration: ${formatDuration(data.averageSessionDuration || 0)}`, 30, 98)
    
    doc.save(`ga4-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    toast.success('Report exported to PDF')
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toLocaleString() || '0'
  }

  const formatPercentage = (num) => {
    return `${num?.toFixed(1) || '0'}%`
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const MetricCard = ({ title, value, change, icon: Icon, format = 'number', color = 'orange' }) => {
    const isPositive = change >= 0
    const formattedValue = format === 'number' ? formatNumber(value) : 
                          format === 'percentage' ? formatPercentage(value) :
                          format === 'duration' ? formatDuration(value) : value

    const colorClasses = {
      orange: 'bg-orange-100 text-orange-600',
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600'
    }

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-3 ${colorClasses[color]} rounded-lg`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{formattedValue}</p>
              {comparisonMode && comparisonData && change !== undefined && (
                <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
                  <span className="text-xs font-medium">{Math.abs(change).toFixed(1)}% vs previous</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8 text-orange-600" />
              Google Analytics 4
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive website analytics and insights</p>
          </div>
          {selectedClient && (
            <div className="flex gap-2">
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  comparisonMode 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ArrowPathRoundedSquareIcon className="w-5 h-5" />
                Compare
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                PDF
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Client Selector */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="flex-1 p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-800 font-medium">Real-time Users</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {realTimeUsers !== undefined ? realTimeUsers : '-'}
                        </p>
                      </div>
                      <BoltIcon className="w-8 h-8 text-orange-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              <p className="text-gray-600 mt-4">Loading analytics data...</p>
            </div>
          </div>
        )}

        {/* Data Display */}
        {!loading && selectedClient && data && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Users"
                value={data.totalUsers || 0}
                change={comparisonData ? calculateChange(data.totalUsers, comparisonData.totalUsers) : 0}
                icon={UsersIcon}
                format="number"
                color="orange"
              />
              <MetricCard
                title="Page Views"
                value={data.screenPageViews || 0}
                change={comparisonData ? calculateChange(data.screenPageViews, comparisonData.screenPageViews) : 0}
                icon={EyeIcon}
                format="number"
                color="blue"
              />
              <MetricCard
                title="Avg. Session Duration"
                value={data.averageSessionDuration || 0}
                change={comparisonData ? calculateChange(data.averageSessionDuration, comparisonData.averageSessionDuration) : 0}
                icon={ClockIcon}
                format="duration"
                color="green"
              />
              <MetricCard
                title="Bounce Rate"
                value={data.bounceRate || 0}
                change={comparisonData ? calculateChange(data.bounceRate, comparisonData.bounceRate) : 0}
                icon={GlobeAltIcon}
                format="percentage"
                color="purple"
              />
            </div>

            {/* Tabs Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex -mb-px">
                  {[
                    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                    { id: 'traffic', label: 'Traffic Sources', icon: GlobeAltIcon },
                    { id: 'devices', label: 'Devices', icon: DevicePhoneMobileIcon },
                    { id: 'realtime', label: 'Real-time', icon: BoltIcon }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-orange-500 text-orange-600 bg-orange-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Additional Metrics */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Sessions</p>
                          <p className="text-2xl font-bold text-gray-900">{formatNumber(data.sessions || 0)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Engaged Sessions</p>
                          <p className="text-2xl font-bold text-gray-900">{formatNumber(data.engagedSessions || 0)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Engagement Rate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {data.sessions ? formatPercentage((data.engagedSessions / data.sessions) * 100) : '0%'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Time Series Chart */}
                    {timeSeriesData.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                              <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Area type="monotone" dataKey="users" stroke="#f97316" fillOpacity={1} fill="url(#colorUsers)" name="Users" />
                              <Area type="monotone" dataKey="pageViews" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" name="Page Views" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Top Pages Table */}
                    {data.topPages && data.topPages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Page Title</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Views</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Users</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {data.topPages.slice(0, 10).map((page, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    <div className="font-medium">{page.pageTitle || page.pagePath || page.path}</div>
                                    {page.pageTitle && page.pagePath && (
                                      <div className="text-xs text-gray-500 mt-1">{page.pagePath}</div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{formatNumber(page.views || page.screenPageViews)}</td>
                                  <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatNumber(page.users || page.totalUsers)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Traffic Sources Tab */}
                {activeTab === 'traffic' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Traffic Sources Breakdown</h3>
                    
                    {trafficSources.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={trafficSources}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="users"
                              >
                                {trafficSources.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="space-y-3">
                          {trafficSources.map((source, index) => (
                            <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  <span className="font-medium text-gray-900">{source.name}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-600">{formatNumber(source.users)} users</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="text-gray-500">Sessions</p>
                                  <p className="font-medium">{formatNumber(source.sessions)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Bounce Rate</p>
                                  <p className="font-medium">{formatPercentage(source.bounceRate || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Avg. Duration</p>
                                  <p className="font-medium">{formatDuration(source.avgDuration || 0)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <GlobeAltIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p>No traffic source data available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Devices Tab */}
                {activeTab === 'devices' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Device Breakdown</h3>
                    
                    {deviceData.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deviceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="device" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="users" fill="#f97316" name="Users" />
                              <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="space-y-3">
                          {deviceData.map((device, index) => {
                            const iconMap = {
                              desktop: ComputerDesktopIcon,
                              mobile: DevicePhoneMobileIcon,
                              tablet: DeviceTabletIcon
                            }
                            const Icon = iconMap[device.device.toLowerCase()] || DevicePhoneMobileIcon
                            
                            return (
                              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <Icon className="w-6 h-6 text-gray-600" />
                                    <span className="font-medium text-gray-900 capitalize">{device.device}</span>
                                  </div>
                                  <span className="text-sm font-medium text-gray-600">{formatNumber(device.users)} users</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <p className="text-gray-500">Sessions</p>
                                    <p className="font-medium">{formatNumber(device.sessions)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Bounce Rate</p>
                                    <p className="font-medium">{formatPercentage(device.bounceRate || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">% of Total</p>
                                    <p className="font-medium">
                                      {formatPercentage((device.users / deviceData.reduce((sum, d) => sum + d.users, 0)) * 100)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <DevicePhoneMobileIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p>No device data available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Real-time Tab */}
                {activeTab === 'realtime' && (
                  <div className="space-y-6">
                    {/* Header Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">Realtime overview</h3>
                      
                      {/* Top Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">ACTIVE USERS IN LAST 30 MINUTES</p>
                          <p className="text-5xl font-bold text-gray-900">{realTimeLast30Min}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">ACTIVE USERS IN LAST 5 MINUTES</p>
                          <p className="text-5xl font-bold text-gray-900">{realTimeLast5Min}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">ACTIVE USERS PER MINUTE</p>
                          <p className="text-5xl font-bold text-gray-900">{realTimeUsers}</p>
                        </div>
                      </div>

                      {/* Active Users Per Minute Chart */}
                      {realTimeMinuteData && realTimeMinuteData.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-4">ACTIVE USERS PER MINUTE</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={realTimeMinuteData.slice().reverse()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="minutesAgo" 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => `-${value} min`}
                              />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                labelFormatter={(value) => `${value} minutes ago`}
                              />
                              <Bar dataKey="activeUsers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Data Grid - 4 Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Active Users by Source */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700">Active users by Location</h4>
                        </div>
                        <div className="p-6">
                          {realTimeSources && realTimeSources.length > 0 ? (
                            <div className="space-y-4">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left text-xs font-medium text-gray-500 pb-2">LOCATION</th>
                                    <th className="text-right text-xs font-medium text-gray-500 pb-2">ACTIVE USERS</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {realTimeSources.map((source, index) => (
                                    <tr key={index}>
                                      <td className="py-3 text-sm text-gray-900">{source.source}</td>
                                      <td className="py-3 text-sm text-right text-gray-900">{source.activeUsers}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-8">No data available</p>
                          )}
                        </div>
                      </div>

                      {/* Active Users by Audience */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700">Active users by Audience</h4>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            <table className="min-w-full">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left text-xs font-medium text-gray-500 pb-2">AUDIENCE</th>
                                  <th className="text-right text-xs font-medium text-gray-500 pb-2">ACTIVE USERS</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="py-3 text-sm text-blue-600 underline cursor-pointer">All Users</td>
                                  <td className="py-3 text-sm text-right text-gray-900">{realTimeLast30Min}</td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="text-center text-sm text-gray-500">100%</div>
                          </div>
                        </div>
                      </div>

                      {/* Views by Page Title */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700">Views by Page title and screen name</h4>
                        </div>
                        <div className="p-6">
                          {realTimePages && realTimePages.length > 0 ? (
                            <div className="space-y-4">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left text-xs font-medium text-gray-500 pb-2">PAGE TITLE AND SCREEN NAME</th>
                                    <th className="text-right text-xs font-medium text-gray-500 pb-2">VIEWS</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {realTimePages.map((page, index) => (
                                    <tr key={index}>
                                      <td className="py-3 text-sm text-blue-600 underline cursor-pointer truncate max-w-xs">
                                        {page.page}
                                      </td>
                                      <td className="py-3 text-sm text-right text-gray-900">{page.views}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-8">No data available</p>
                          )}
                        </div>
                      </div>

                      {/* Event Count by Event Name */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700">Event count by Event name</h4>
                        </div>
                        <div className="p-6">
                          {realTimeEvents && realTimeEvents.length > 0 ? (
                            <div className="space-y-4">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left text-xs font-medium text-gray-500 pb-2">EVENT NAME</th>
                                    <th className="text-right text-xs font-medium text-gray-500 pb-2">EVENT COUNT</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {realTimeEvents.map((event, index) => (
                                    <tr key={index}>
                                      <td className="py-3 text-sm text-blue-600 underline cursor-pointer">
                                        {event.event}
                                      </td>
                                      <td className="py-3 text-sm text-right text-gray-900">{event.eventCount}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-8">No data available</p>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Info Footer */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <BoltIcon className="w-4 h-4 inline mr-2" />
                        <strong>Real-time data:</strong> This report shows activity in the last 30 minutes. Data automatically refreshes every 10 seconds.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !selectedClient && (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
            <p className="text-gray-600">Choose a client to view their Google Analytics 4 data</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && selectedClient && !data && (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Google Analytics 4 may not be configured for this client</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
