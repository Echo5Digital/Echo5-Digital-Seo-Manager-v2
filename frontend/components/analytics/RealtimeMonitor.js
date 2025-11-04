import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Eye, MousePointerClick, Globe } from 'lucide-react';

const PulseIndicator = () => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
  </span>
);

const MetricCard = ({ icon: Icon, label, value, color = 'blue', pulse = false }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    whileHover={{ scale: 1.02 }}
    className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-${color}-100`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      {pulse && <PulseIndicator />}
    </div>
    <p className="text-sm text-gray-600 mb-1">{label}</p>
    <motion.p 
      key={value}
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-3xl font-bold text-gray-900"
    >
      {typeof value === 'number' ? value.toLocaleString() : value}
    </motion.p>
  </motion.div>
);

const TopPageItem = ({ page, index, users }) => (
  <motion.div
    initial={{ x: -20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay: index * 0.1 }}
    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
        {index + 1}
      </div>
      <span className="text-sm text-gray-900 truncate">{page}</span>
    </div>
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-gray-400" />
      <span className="text-sm font-semibold text-gray-900">{users}</span>
    </div>
  </motion.div>
);

export default function RealtimeMonitor({ data, loading = false, onRefresh }) {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  useEffect(() => {
    if (!loading) {
      setLastUpdate(new Date());
    }
  }, [data, loading]);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-12 w-12 bg-gray-200 animate-pulse rounded-lg mb-4" />
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Transform data
  const activeUsers = parseInt(data?.data?.rows?.[0]?.metricValues?.[0]?.value || 0);
  const screenPageViews = parseInt(data?.data?.rows?.[0]?.metricValues?.[1]?.value || 0);
  const eventCount = parseInt(data?.data?.rows?.[0]?.metricValues?.[2]?.value || 0);
  
  // Extract top pages
  const topPages = data?.data?.rows
    ?.map(row => ({
      page: row.dimensionValues[0]?.value || '/',
      users: parseInt(row.metricValues[0]?.value || 0)
    }))
    .filter(item => item.page !== '(not set)')
    .slice(0, 5) || [];
  
  if (!data?.data?.rows || data.data.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Real-time Activity</h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No active users right now</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Real-time Activity</h3>
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Refresh Now
          </button>
        )}
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Active Users"
          value={activeUsers}
          color="green"
          pulse={activeUsers > 0}
        />
        <MetricCard
          icon={Eye}
          label="Page Views (30 min)"
          value={screenPageViews}
          color="blue"
        />
        <MetricCard
          icon={MousePointerClick}
          label="Events (30 min)"
          value={eventCount}
          color="purple"
        />
        <MetricCard
          icon={Globe}
          label="Active Pages"
          value={topPages.length}
          color="orange"
        />
      </div>
      
      {/* Active Users Indicator */}
      {activeUsers > 0 && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-30" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-green-500">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {activeUsers} {activeUsers === 1 ? 'person' : 'people'} active now
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Viewing your website in real-time
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Top Active Pages */}
      {topPages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Top Active Pages</h4>
          <div className="space-y-2">
            <AnimatePresence>
              {topPages.map((item, index) => (
                <TopPageItem
                  key={item.page}
                  page={item.page}
                  index={index}
                  users={item.users}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {/* Activity Timeline Visualization */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Activity Level</h4>
        <div className="flex items-end justify-between h-32 gap-1">
          {[...Array(30)].map((_, i) => {
            const height = Math.random() * 100;
            const isActive = i >= 25; // Last 5 bars represent current activity
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.02 }}
                className={`flex-1 rounded-t ${
                  isActive ? 'bg-green-500' : 'bg-blue-500'
                } opacity-${isActive ? '100' : '50'}`}
                title={`${Math.round(height)}% activity`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
          <span>30 min ago</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}
