import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Monitor, Smartphone, Tablet, Laptop } from 'lucide-react';

const DEVICE_COLORS = {
  'desktop': '#3B82F6',
  'mobile': '#8B5CF6',
  'tablet': '#10B981',
  'unknown': '#9CA3AF'
};

const DEVICE_ICONS = {
  'desktop': Monitor,
  'mobile': Smartphone,
  'tablet': Tablet,
  'unknown': Laptop
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-900 mb-2 capitalize">{data.category}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-600">Users:</span>
          <span className="text-sm font-semibold">{data.users.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-600">Sessions:</span>
          <span className="text-sm font-semibold">{data.sessions.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-600">Percentage:</span>
          <span className="text-sm font-semibold">{data.percentage}%</span>
        </div>
      </div>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.03) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-sm font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DeviceBreakdown({ data, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-80 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }
  
  // Transform data
  const deviceData = data?.data?.rows?.map((row) => {
    const category = row.dimensionValues[0]?.value?.toLowerCase() || 'unknown';
    const users = parseInt(row.metricValues[0]?.value || 0);
    const sessions = parseInt(row.metricValues[1]?.value || 0);
    
    return { category, users, sessions };
  }) || [];
  
  // Calculate percentages and add colors
  const totalUsers = deviceData.reduce((sum, item) => sum + item.users, 0);
  const chartData = deviceData.map(item => ({
    ...item,
    percentage: totalUsers > 0 ? ((item.users / totalUsers) * 100).toFixed(1) : 0,
    color: DEVICE_COLORS[item.category] || DEVICE_COLORS.unknown
  }));
  
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
        <div className="flex items-center justify-center h-80 text-gray-500">
          <div className="text-center">
            <Monitor className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No device data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Device Breakdown</h3>
        <p className="text-sm text-gray-600 mt-1">Users by device category</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={50}
                fill="#8884d8"
                dataKey="users"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Device Cards */}
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const Icon = DEVICE_ICONS[item.category] || DEVICE_ICONS.unknown;
            
            return (
              <motion.div
                key={item.category}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                {/* Progress Bar Background */}
                <div 
                  className="absolute inset-y-0 left-0 opacity-10"
                  style={{ 
                    width: `${item.percentage}%`,
                    backgroundColor: item.color
                  }}
                />
                
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                      <span className="font-semibold text-gray-900 capitalize">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.percentage}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-600">Users</p>
                      <p className="text-lg font-bold text-gray-900">
                        {item.users.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Sessions</p>
                      <p className="text-lg font-bold text-gray-900">
                        {item.sessions.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Most Popular</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {(() => {
                const Icon = DEVICE_ICONS[chartData[0]?.category] || DEVICE_ICONS.unknown;
                return <Icon className="h-5 w-5 text-gray-700" />;
              })()}
              <p className="text-lg font-bold text-gray-900 capitalize">
                {chartData[0]?.category}
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {totalUsers.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Device Types</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {chartData.length}
            </p>
          </div>
        </div>
      </div>
      
      {/* Mobile-First Indicator */}
      {chartData[0]?.category === 'mobile' && parseFloat(chartData[0].percentage) > 50 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-semibold text-purple-900">Mobile-First Audience</p>
              <p className="text-sm text-purple-700">
                Over 50% of your traffic comes from mobile devices
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
