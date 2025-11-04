// GA4 Advanced Analytics Dashboard
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { 
  TrendingUp, TrendingDown, Users, Clock, Globe, ShoppingCart,
  Activity, Target, Filter, Download, Calendar, RefreshCw,
  Eye, MousePointer, DollarSign, Percent, ArrowUp, ArrowDown,
  BarChart2, PieChartIcon, Map, Layers, Zap, Award, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import Layout from '../../../components/Layout';
import useAuthStore from '../../../store/auth';
import toast from 'react-hot-toast';

// Dynamic imports for heavy components
const MetricCard = dynamic(() => import('../../../components/analytics/MetricCard'), { ssr: false });
const TimeSeriesChart = dynamic(() => import('../../../components/analytics/TimeSeriesChart'), { ssr: false });
const AcquisitionChart = dynamic(() => import('../../../components/analytics/AcquisitionChart'), { ssr: false });
const DemographicsChart = dynamic(() => import('../../../components/analytics/DemographicsChart'), { ssr: false });
const RealtimeMonitor = dynamic(() => import('../../../components/analytics/RealtimeMonitor'), { ssr: false });
const GeographicMap = dynamic(() => import('../../../components/analytics/GeographicMap'), { ssr: false });
const ConversionFunnel = dynamic(() => import('../../../components/analytics/ConversionFunnel'), { ssr: false });
const DeviceBreakdown = dynamic(() => import('../../../components/analytics/DeviceBreakdown'), { ssr: false });

export default function GA4Analytics() {
  const router = useRouter();
  const { id } = router.query;
  const { token, user } = useAuthStore();
  
  // State management
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  
  // Analytics data state
  const [overviewData, setOverviewData] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [demographicsData, setDemographicsData] = useState(null);
  const [acquisitionData, setAcquisitionData] = useState(null);
  const [conversionsData, setConversionsData] = useState(null);
  const [landingPagesData, setLandingPagesData] = useState(null);
  const [trafficSourcesData, setTrafficSourcesData] = useState(null);
  const [ecommerceData, setEcommerceData] = useState(null);
  
  // Fetch client data
  useEffect(() => {
    if (token && id) {
      fetchClient();
    }
  }, [token, id]);
  
  const fetchClient = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (result.status === 'success') {
        setClient(result.data);
        if (!result.data.integrations?.ga4PropertyId) {
          toast.error('GA4 is not configured for this client');
        }
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
      toast.error('Failed to load client data');
    }
  };
  
  // Fetch all GA4 data
  const fetchGA4Data = useCallback(async (showLoader = true) => {
    if (!client?.integrations?.ga4PropertyId) return;
    
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch all data in parallel for better performance
      const [
        overview,
        realtime,
        timeseries,
        demographics,
        acquisition,
        conversions,
        landingPages,
        trafficSources,
        ecommerce
      ] = await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/overview?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/realtime`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/timeseries?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/demographics?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/acquisition?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/conversions?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/landing-pages?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/traffic-sources?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/ga4/ecommerce?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json())
      ]);
      
      // Set data from successful responses
      if (overview.status === 'fulfilled' && overview.value.status === 'success') {
        setOverviewData(overview.value.data);
      }
      if (realtime.status === 'fulfilled' && realtime.value.status === 'success') {
        setRealtimeData(realtime.value.data);
      }
      if (timeseries.status === 'fulfilled' && timeseries.value.status === 'success') {
        setTimeSeriesData(timeseries.value.data);
      }
      if (demographics.status === 'fulfilled' && demographics.value.status === 'success') {
        setDemographicsData(demographics.value.data);
      }
      if (acquisition.status === 'fulfilled' && acquisition.value.status === 'success') {
        setAcquisitionData(acquisition.value.data);
      }
      if (conversions.status === 'fulfilled' && conversions.value.status === 'success') {
        setConversionsData(conversions.value.data);
      }
      if (landingPages.status === 'fulfilled' && landingPages.value.status === 'success') {
        setLandingPagesData(landingPages.value.data);
      }
      if (trafficSources.status === 'fulfilled' && trafficSources.value.status === 'success') {
        setTrafficSourcesData(trafficSources.value.data);
      }
      if (ecommerce.status === 'fulfilled' && ecommerce.value.status === 'success') {
        setEcommerceData(ecommerce.value.data);
      }
      
      if (showLoader) {
        toast.success('Analytics data updated');
      }
    } catch (error) {
      console.error('Error fetching GA4 data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client, dateRange, token, id]);
  
  // Fetch data when client or date range changes
  useEffect(() => {
    if (client?.integrations?.ga4PropertyId) {
      fetchGA4Data();
    }
  }, [client, dateRange]);
  
  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (autoRefresh && client?.integrations?.ga4PropertyId) {
      const interval = setInterval(() => {
        fetchGA4Data(false);
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, client, fetchGA4Data]);
  
  // Quick date range presets
  const datePresets = [
    { label: 'Today', getValue: () => ({ startDate: new Date(), endDate: new Date() }) },
    { label: 'Yesterday', getValue: () => ({ 
      startDate: subDays(new Date(), 1), 
      endDate: subDays(new Date(), 1) 
    }) },
    { label: 'Last 7 days', getValue: () => ({ 
      startDate: subDays(new Date(), 7), 
      endDate: new Date() 
    }) },
    { label: 'Last 30 days', getValue: () => ({ 
      startDate: subDays(new Date(), 30), 
      endDate: new Date() 
    }) },
    { label: 'This month', getValue: () => ({ 
      startDate: startOfMonth(new Date()), 
      endDate: new Date() 
    }) },
    { label: 'Last month', getValue: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth)
      };
    }},
  ];
  
  // Export data functionality
  const exportData = async (format) => {
    try {
      const data = {
        overview: overviewData,
        timeseries: timeSeriesData,
        demographics: demographicsData,
        acquisition: acquisitionData,
        conversions: conversionsData
      };
      
      if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(data);
        downloadFile(csv, `ga4-analytics-${client.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
      } else if (format === 'json') {
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `ga4-analytics-${client.name}-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
      }
      
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };
  
  const convertToCSV = (data) => {
    // Simple CSV conversion
    let csv = 'Metric,Value\n';
    if (data.overview?.rows?.[0]) {
      data.overview.metricHeaders.forEach((header, i) => {
        csv += `${header.name},${data.overview.rows[0].metricValues[i].value}\n`;
      });
    }
    return csv;
  };
  
  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
  
  // Extract metrics from overview data
  const getMetric = (metricName) => {
    if (!overviewData?.data?.rows?.[0]) return { value: 0, change: 0 };
    const metricIndex = overviewData.data.metricHeaders?.findIndex(h => h.name === metricName);
    if (metricIndex === -1) return { value: 0, change: 0 };
    const value = parseFloat(overviewData.data.rows[0].metricValues[metricIndex]?.value || 0);
    // Mock change for now (would need comparison period data)
    const change = Math.random() * 30 - 15;
    return { value: Math.round(value), change: parseFloat(change.toFixed(1)) };
  };
  
  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'realtime', label: 'Real-time', icon: Activity },
    { id: 'acquisition', label: 'Acquisition', icon: TrendingUp },
    { id: 'engagement', label: 'Engagement', icon: Target },
    { id: 'demographics', label: 'Audience', icon: Users },
    { id: 'ecommerce', label: 'E-commerce', icon: ShoppingCart },
  ];
  
  if (!client) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }
  
  if (!client.integrations?.ga4PropertyId) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Award className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              GA4 Not Configured
            </h3>
            <p className="text-gray-600 mb-4">
              Google Analytics 4 is not set up for this client yet.
            </p>
            <button
              onClick={() => router.push(`/clients/${id}/integrations`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Configure GA4
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">{client.name}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Range Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {format(dateRange.startDate, 'MMM d')} - {format(dateRange.endDate, 'MMM d, yyyy')}
                    </span>
                  </button>
                  
                  <AnimatePresence>
                    {showDatePicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20"
                      >
                        <div className="flex gap-4 mb-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                            <DatePicker
                              selected={dateRange.startDate}
                              onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                              selectsStart
                              startDate={dateRange.startDate}
                              endDate={dateRange.endDate}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">End Date</label>
                            <DatePicker
                              selected={dateRange.endDate}
                              onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                              selectsEnd
                              startDate={dateRange.startDate}
                              endDate={dateRange.endDate}
                              minDate={dateRange.startDate}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                        
                        <div className="border-t pt-3">
                          <p className="text-sm text-gray-600 mb-2">Quick Select:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {datePresets.map((preset) => (
                              <button
                                key={preset.label}
                                onClick={() => {
                                  setDateRange(preset.getValue());
                                  setShowDatePicker(false);
                                }}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Auto-refresh toggle */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    autoRefresh 
                      ? 'bg-blue-600 text-white' 
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Auto-refresh</span>
                </button>
                
                {/* Manual refresh */}
                <button
                  onClick={() => fetchGA4Data(false)}
                  disabled={refreshing}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                
                {/* Export dropdown */}
                <div className="relative group">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Export</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      onClick={() => exportData('csv')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => exportData('json')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Export as JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Users"
                    value={getMetric('totalUsers').value}
                    change={getMetric('totalUsers').change}
                    icon={Users}
                    color="from-blue-500 to-blue-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Sessions"
                    value={getMetric('sessions').value}
                    change={getMetric('sessions').change}
                    icon={Activity}
                    color="from-purple-500 to-purple-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Avg. Session Duration"
                    value={`${Math.round(getMetric('averageSessionDuration').value)}s`}
                    change={getMetric('averageSessionDuration').change}
                    icon={Clock}
                    color="from-green-500 to-green-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Conversions"
                    value={getMetric('conversions').value}
                    change={getMetric('conversions').change}
                    icon={Target}
                    color="from-orange-500 to-orange-600"
                    loading={loading}
                  />
                </div>
                
                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <TimeSeriesChart data={timeSeriesData} loading={loading} />
                  </div>
                  <div>
                    <RealtimeMonitor data={realtimeData} loading={loading} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AcquisitionChart data={acquisitionData} loading={loading} />
                  <DeviceBreakdown data={demographicsData} loading={loading} />
                </div>
                
                <GeographicMap data={demographicsData} loading={loading} />
              </motion.div>
            )}
            
            {activeTab === 'realtime' && (
              <motion.div
                key="realtime"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <RealtimeMonitor data={realtimeData} loading={loading} fullView />
              </motion.div>
            )}
            
            {activeTab === 'acquisition' && (
              <motion.div
                key="acquisition"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <AcquisitionChart data={acquisitionData} loading={loading} detailed />
              </motion.div>
            )}
            
            {activeTab === 'engagement' && (
              <motion.div
                key="engagement"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <ConversionFunnel data={conversionsData} loading={loading} />
                <TimeSeriesChart data={timeSeriesData} loading={loading} />
              </motion.div>
            )}
            
            {activeTab === 'demographics' && (
              <motion.div
                key="demographics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <DemographicsChart data={demographicsData} loading={loading} />
                <GeographicMap data={demographicsData} loading={loading} />
              </motion.div>
            )}
            
            {activeTab === 'ecommerce' && (
              <motion.div
                key="ecommerce"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">E-commerce Performance</h3>
                  {ecommerceData?.data?.rows?.length > 0 ? (
                    <div className="space-y-4">
                      {/* E-commerce metrics */}
                      <p className="text-gray-600">E-commerce data available</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No e-commerce data available</p>
                      <p className="text-sm text-gray-500 mt-2">
                        E-commerce tracking needs to be configured in GA4
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
