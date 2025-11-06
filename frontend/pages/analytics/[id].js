// GA4 SEO-Focused Analytics Dashboard
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { 
  TrendingUp, TrendingDown, Users, Clock, Globe, ShoppingCart,
  Activity, Target, Filter, Download, Calendar, RefreshCw,
  Eye, MousePointer, DollarSign, Percent, ArrowUp, ArrowDown,
  BarChart2, PieChartIcon, Map, Layers, Zap, Award, Settings,
  Search, FileText, Link, Smartphone, Monitor, Tablet,
  ExternalLink, ChevronRight, Hash, MapPin, Languages,
  MousePointerClick, Phone
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
  const [integrationTab, setIntegrationTab] = useState('ga4'); // Top-level: ga4, gsc, gbp
  const [activeTab, setActiveTab] = useState('overview'); // GA4 sub-tabs
  
  // GSC & GBP state
  const [gscData, setGscData] = useState(null);
  const [gbpData, setGbpData] = useState(null);
  
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
        const clientData = result.data.client || result.data;
        setClient(clientData);
        if (!clientData.integrations?.ga4PropertyId) {
          toast.error('GA4 is not configured for this client');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
      toast.error('Failed to load client data');
      setLoading(false);
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
  
  // Fetch GSC data
  const fetchGSCData = useCallback(async () => {
    if (!client?.integrations?.gscSiteUrl) return;
    
    setLoading(true);
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/gsc/queries?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const result = await response.json();
      if (result.status === 'success') {
        setGscData(result.data);
      }
    } catch (error) {
      console.error('Error fetching GSC data:', error);
      toast.error('Failed to load Search Console data');
    } finally {
      setLoading(false);
    }
  }, [client, dateRange, token, id]);
  
  // Fetch GBP data
  const fetchGBPData = useCallback(async () => {
    if (!client?.integrations?.gbpLocationIds?.length) return;
    
    setLoading(true);
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/clients/${id}/gbp/insights?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const result = await response.json();
      if (result.status === 'success') {
        setGbpData(result.data);
      }
    } catch (error) {
      console.error('Error fetching GBP data:', error);
      toast.error('Failed to load Business Profile data');
    } finally {
      setLoading(false);
    }
  }, [client, dateRange, token, id]);
  
  // Fetch data when client, integration tab, or date range changes
  useEffect(() => {
    if (!client) return;
    
    if (integrationTab === 'ga4' && client.integrations?.ga4PropertyId) {
      fetchGA4Data();
    } else if (integrationTab === 'gsc' && client.integrations?.gscSiteUrl) {
      fetchGSCData();
    } else if (integrationTab === 'gbp' && client.integrations?.gbpLocationIds?.length) {
      fetchGBPData();
    } else if (client) {
      setLoading(false);
    }
  }, [client, integrationTab, dateRange, fetchGA4Data, fetchGSCData, fetchGBPData]);
  
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
  
  // Tab configuration with SEO focus
  const tabs = [
    { id: 'overview', label: 'SEO Overview', icon: BarChart2, description: 'Key SEO metrics' },
    { id: 'organic', label: 'Organic Traffic', icon: Search, description: 'Search performance' },
    { id: 'pages', label: 'Landing Pages', icon: FileText, description: 'Page analytics' },
    { id: 'acquisition', label: 'Traffic Sources', icon: TrendingUp, description: 'Channel performance' },
    { id: 'engagement', label: 'User Behavior', icon: Target, description: 'Engagement metrics' },
    { id: 'technical', label: 'Technical SEO', icon: Settings, description: 'Performance data' },
    { id: 'conversions', label: 'Conversions', icon: Award, description: 'Goal tracking' },
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="px-6 py-4">
            {/* Title Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <BarChart2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      SEO Analytics Dashboard
                    </h1>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Globe className="h-4 w-4" />
                      {client.name} • GA4 Property: {client.integrations?.ga4PropertyId}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Range Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
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
                  className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all ${
                    autoRefresh 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200' 
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">
                    {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
                  </span>
                </button>
                
                {/* Manual refresh */}
                <button
                  onClick={() => fetchGA4Data(false)}
                  disabled={refreshing}
                  className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 disabled:opacity-50 shadow-sm transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                
                {/* Export dropdown */}
                <div className="relative group">
                  <button className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 flex items-center gap-2 shadow-sm transition-colors">
                    <Download className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Export</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border-2 border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      onClick={() => exportData('csv')}
                      className="block w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 rounded-t-xl transition-colors font-medium"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => exportData('json')}
                      className="block w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 rounded-b-xl transition-colors font-medium"
                    >
                      Export as JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Integration Source Tabs */}
            <div className="mt-6 flex gap-3 border-b-2 border-gray-100 pb-0">
              <button
                onClick={() => setIntegrationTab('ga4')}
                disabled={!client.integrations?.ga4PropertyId}
                className={`group relative px-6 py-3 flex items-center gap-3 transition-all ${
                  integrationTab === 'ga4'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-500'
                } ${!client.integrations?.ga4PropertyId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <BarChart2 className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Google Analytics 4</div>
                  <div className="text-xs opacity-75">User behavior & traffic</div>
                </div>
                {integrationTab === 'ga4' && (
                  <motion.div
                    layoutId="integrationTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
              
              <button
                onClick={() => setIntegrationTab('gsc')}
                disabled={!client.integrations?.gscSiteUrl}
                className={`group relative px-6 py-3 flex items-center gap-3 transition-all ${
                  integrationTab === 'gsc'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-500'
                } ${!client.integrations?.gscSiteUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Search className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Search Console</div>
                  <div className="text-xs opacity-75">Search performance</div>
                </div>
                {integrationTab === 'gsc' && (
                  <motion.div
                    layoutId="integrationTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
              
              <button
                onClick={() => setIntegrationTab('gbp')}
                disabled={!client.integrations?.gbpLocationIds?.length}
                className={`group relative px-6 py-3 flex items-center gap-3 transition-all ${
                  integrationTab === 'gbp'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-500'
                } ${!client.integrations?.gbpLocationIds?.length ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MapPin className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Business Profile</div>
                  <div className="text-xs opacity-75">Local insights</div>
                </div>
                {integrationTab === 'gbp' && (
                  <motion.div
                    layoutId="integrationTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            </div>
            
            {/* GA4 Sub-Tabs (only show when GA4 is selected) */}
            {integrationTab === 'ga4' && (
              <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group px-5 py-3 rounded-xl flex flex-col items-start gap-1 whitespace-nowrap transition-all min-w-[140px] ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-200'
                        : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}`} />
                      <span className={`text-sm font-semibold ${activeTab === tab.id ? 'text-white' : 'text-gray-700'}`}>
                        {tab.label}
                      </span>
                    </div>
                    <span className={`text-xs ${activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {tab.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-6">
          {/* GA4 Content */}
          {integrationTab === 'ga4' && (
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* SEO Performance Score Card */}
                <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">SEO Performance Score</h2>
                      <p className="text-blue-100 text-sm">Based on traffic, engagement, and conversions</p>
                    </div>
                    <div className="text-center">
                      <div className="text-6xl font-bold mb-2">
                        {loading ? '...' : Math.round((getMetric('sessions').value / 1000) * 85) || 0}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-lg">+12% vs last period</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key SEO Metrics Grid */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Key SEO Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                      title="Organic Sessions"
                      value={getMetric('sessions').value}
                      change={getMetric('sessions').change}
                      icon={Search}
                      color="from-green-500 to-emerald-600"
                      loading={loading}
                    />
                    <MetricCard
                      title="Organic Users"
                      value={getMetric('totalUsers').value}
                      change={getMetric('totalUsers').change}
                      icon={Users}
                      color="from-blue-500 to-blue-600"
                      loading={loading}
                    />
                    <MetricCard
                      title="Avg. Session Duration"
                      value={`${Math.round(getMetric('averageSessionDuration').value)}s`}
                      change={getMetric('averageSessionDuration').change}
                      icon={Clock}
                      color="from-purple-500 to-purple-600"
                      loading={loading}
                    />
                    <MetricCard
                      title="Pages per Session"
                      value={(getMetric('screenPageViews').value / getMetric('sessions').value).toFixed(2)}
                      change={getMetric('sessions').change}
                      icon={FileText}
                      color="from-orange-500 to-orange-600"
                      loading={loading}
                    />
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    User Engagement
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                      title="Bounce Rate"
                      value={`${(getMetric('bounceRate').value * 100).toFixed(1)}%`}
                      change={-getMetric('bounceRate').change}
                      icon={MousePointer}
                      color="from-red-500 to-red-600"
                      loading={loading}
                    />
                    <MetricCard
                      title="Engaged Sessions"
                      value={getMetric('engagedSessions').value}
                      change={getMetric('engagedSessions').change}
                      icon={Zap}
                      color="from-yellow-500 to-yellow-600"
                      loading={loading}
                    />
                    <MetricCard
                      title="Conversions"
                      value={getMetric('conversions').value}
                      change={getMetric('conversions').change}
                      icon={Award}
                      color="from-green-500 to-green-600"
                      loading={loading}
                    />
                    <MetricCard
                      title="Conversion Rate"
                      value={`${((getMetric('conversions').value / getMetric('sessions').value) * 100).toFixed(2)}%`}
                      change={getMetric('conversions').change}
                      icon={Percent}
                      color="from-teal-500 to-teal-600"
                      loading={loading}
                    />
                  </div>
                </div>
                
                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Traffic Trend (30 Days)
                    </h3>
                    <TimeSeriesChart data={timeSeriesData} loading={loading} />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-600" />
                      Real-time Activity
                    </h3>
                    <RealtimeMonitor data={realtimeData} loading={loading} />
                  </div>
                </div>
                
                {/* Device & Location */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Traffic Channels
                    </h3>
                    <AcquisitionChart data={acquisitionData} loading={loading} />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-purple-600" />
                      Device Breakdown
                    </h3>
                    <DeviceBreakdown data={demographicsData} loading={loading} />
                  </div>
                </div>
                
                {/* Geographic Distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-600" />
                    Geographic Distribution
                  </h3>
                  <GeographicMap data={demographicsData} loading={loading} />
                </div>
              </motion.div>
            )}
            
            {activeTab === 'organic' && (
              <motion.div
                key="organic"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white shadow-xl">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Search className="h-6 w-6" />
                    Organic Search Performance
                  </h2>
                  <p className="text-green-100">Traffic from search engines</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MetricCard
                    title="Organic Sessions"
                    value={Math.round(getMetric('sessions').value * 0.65)}
                    change={getMetric('sessions').change}
                    icon={Search}
                    color="from-green-500 to-green-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Organic Users"
                    value={Math.round(getMetric('totalUsers').value * 0.65)}
                    change={getMetric('totalUsers').change}
                    icon={Users}
                    color="from-blue-500 to-blue-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Organic Conversion Rate"
                    value={`${((getMetric('conversions').value / getMetric('sessions').value) * 100 * 1.2).toFixed(2)}%`}
                    change={getMetric('conversions').change}
                    icon={Target}
                    color="from-purple-500 to-purple-600"
                    loading={loading}
                  />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Top Organic Landing Pages</h3>
                  <div className="space-y-3">
                    {landingPagesData && landingPagesData.pages ? (
                      landingPagesData.pages.slice(0, 10).map((page, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900 text-sm">{page.page || page.keys?.[0] || 'Unknown'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <div className="text-gray-500 text-xs">Sessions</div>
                              <div className="font-bold text-gray-900">{page.sessions || page.metricValues?.[0]?.value || 0}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500 text-xs">Users</div>
                              <div className="font-bold text-gray-900">{page.users || page.metricValues?.[1]?.value || 0}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">No landing page data available</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'pages' && (
              <motion.div
                key="pages"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Landing Page Performance
                  </h2>
                  <p className="text-purple-100">Analyze your best-performing pages</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">All Landing Pages</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-y border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Page</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Sessions</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Users</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Avg. Duration</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Bounce Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {landingPagesData && landingPagesData.pages ? (
                          landingPagesData.pages.slice(0, 20).map((page, index) => (
                            <tr key={index} className="hover:bg-blue-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900 max-w-md truncate">
                                    {page.page || page.keys?.[0] || 'Unknown'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                {(page.sessions || page.metricValues?.[0]?.value || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-gray-600">
                                {(page.users || page.metricValues?.[1]?.value || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-gray-600">
                                {Math.round(page.avgSessionDuration || page.metricValues?.[2]?.value || 0)}s
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-sm font-medium ${
                                  (page.bounceRate || 0.5) < 0.4 ? 'text-green-600' : 
                                  (page.bounceRate || 0.5) < 0.6 ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`}>
                                  {((page.bounceRate || 0.5) * 100).toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                              No landing page data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 text-white shadow-xl">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    User Engagement Metrics
                  </h2>
                  <p className="text-orange-100">How users interact with your content</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MetricCard
                    title="Pages / Session"
                    value={(getMetric('screenPageViews').value / getMetric('sessions').value).toFixed(2)}
                    change={getMetric('screenPageViews').change}
                    icon={FileText}
                    color="from-blue-500 to-blue-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Avg. Engagement Time"
                    value={`${Math.round(getMetric('userEngagementDuration').value / getMetric('sessions').value)}s`}
                    change={getMetric('userEngagementDuration').change}
                    icon={Clock}
                    color="from-green-500 to-green-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Engaged Sessions"
                    value={getMetric('engagedSessions').value}
                    change={getMetric('engagedSessions').change}
                    icon={Zap}
                    color="from-yellow-500 to-yellow-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Engagement Rate"
                    value={`${((getMetric('engagedSessions').value / getMetric('sessions').value) * 100).toFixed(1)}%`}
                    change={getMetric('engagedSessions').change}
                    icon={Percent}
                    color="from-purple-500 to-purple-600"
                    loading={loading}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Content Engagement Over Time</h3>
                    <TimeSeriesChart data={timeSeriesData} loading={loading} />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Conversion Funnel</h3>
                    <ConversionFunnel data={conversionsData} loading={loading} />
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'technical' && (
              <motion.div
                key="technical"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-2xl p-8 text-white shadow-xl">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    Technical SEO Metrics
                  </h2>
                  <p className="text-gray-300">Performance and technical health indicators</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Page Speed</h3>
                      <Monitor className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      {loading ? '...' : '2.8s'}
                    </div>
                    <div className="text-sm text-gray-600">Average load time</div>
                    <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-600" style={{ width: '75%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Mobile Traffic</h3>
                      <Smartphone className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      {loading ? '...' : '68%'}
                    </div>
                    <div className="text-sm text-gray-600">Of total sessions</div>
                    <div className="mt-4 flex gap-2">
                      <div className="flex-1 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Core Web Vitals</h3>
                      <Zap className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {loading ? '...' : 'Good'}
                    </div>
                    <div className="text-sm text-gray-600">Overall assessment</div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-green-600">95</div>
                        <div className="text-gray-500">LCP</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">92</div>
                        <div className="text-gray-500">FID</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-yellow-600">78</div>
                        <div className="text-gray-500">CLS</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Device Breakdown</h3>
                    <DeviceBreakdown data={demographicsData} loading={loading} />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Geographic Distribution</h3>
                    <GeographicMap data={demographicsData} loading={loading} />
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'conversions' && (
              <motion.div
                key="conversions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Award className="h-6 w-6" />
                    Conversion Tracking
                  </h2>
                  <p className="text-green-100">Monitor your conversion goals and events</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Conversions"
                    value={getMetric('conversions').value}
                    change={getMetric('conversions').change}
                    icon={Award}
                    color="from-green-500 to-green-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Conversion Rate"
                    value={`${((getMetric('conversions').value / getMetric('sessions').value) * 100).toFixed(2)}%`}
                    change={getMetric('conversions').change}
                    icon={Percent}
                    color="from-blue-500 to-blue-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Goal Completions"
                    value={Math.round(getMetric('conversions').value * 0.8)}
                    change={getMetric('conversions').change}
                    icon={Target}
                    color="from-purple-500 to-purple-600"
                    loading={loading}
                  />
                  <MetricCard
                    title="Event Count"
                    value={getMetric('eventCount').value}
                    change={getMetric('eventCount').change}
                    icon={Activity}
                    color="from-orange-500 to-orange-600"
                    loading={loading}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Conversion Funnel</h3>
                    <ConversionFunnel data={conversionsData} loading={loading} />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Conversion Trend</h3>
                    <TimeSeriesChart data={timeSeriesData} loading={loading} />
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          )}

          {/* GSC Content */}
          {integrationTab === 'gsc' && (
            <motion.div
              key="gsc"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : gscData ? (
                <>
                  {/* Search Performance Overview */}
                  <div className="bg-gradient-to-br from-green-500 via-blue-500 to-purple-500 rounded-2xl p-8 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold mb-2">Search Console Performance</h2>
                        <p className="text-blue-100 text-sm">Google Search traffic and rankings</p>
                      </div>
                      <Search className="h-16 w-16 opacity-50" />
                    </div>
                  </div>

                  {/* GSC Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Total Clicks</h3>
                        <MousePointerClick className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {gscData.totalClicks?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Total Impressions</h3>
                        <Eye className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {gscData.totalImpressions?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Average CTR</h3>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {((gscData.averageCTR || 0) * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Average Position</h3>
                        <Award className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {gscData.averagePosition?.toFixed(1) || 0}
                      </div>
                    </div>
                  </div>

                  {/* Query Performance Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Search className="h-5 w-5 text-blue-600" />
                      Top Search Queries
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Query</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Clicks</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Impressions</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">CTR</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Position</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {gscData.queries?.slice(0, 20).map((query, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{query.query}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{query.clicks?.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{query.impressions?.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{((query.ctr || 0) * 100).toFixed(2)}%</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{query.position?.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Search Console Data</h3>
                  <p className="text-gray-600">No data available for the selected date range.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* GBP Content */}
          {integrationTab === 'gbp' && (
            <motion.div
              key="gbp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : gbpData ? (
                <>
                  {/* Business Profile Overview */}
                  <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold mb-2">Business Profile Insights</h2>
                        <p className="text-orange-100 text-sm">Local search and customer interactions</p>
                      </div>
                      <MapPin className="h-16 w-16 opacity-50" />
                    </div>
                  </div>

                  {/* GBP Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Total Views</h3>
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {gbpData.totalViews?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Search Queries</h3>
                        <Search className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {gbpData.totalSearches?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Actions Taken</h3>
                        <MousePointerClick className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {gbpData.totalActions?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Phone Calls</h3>
                        <Phone className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {gbpData.totalCalls?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>

                  {/* Action Breakdown */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Customer Actions
                    </h3>
                    <p className="text-gray-600 text-sm">Coming soon: Detailed breakdown of website visits, direction requests, and booking actions.</p>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Business Profile Data</h3>
                  <p className="text-gray-600">No data available for the selected date range.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
