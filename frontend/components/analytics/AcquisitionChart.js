import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, MousePointerClick, Share2 } from 'lucide-react';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-900 mb-2">{data.channel}</p>
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
          <span className="text-sm text-gray-600">Share:</span>
          <span className="text-sm font-semibold">{data.percentage}%</span>
        </div>
      </div>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null; // Hide labels for slices < 5%
  
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
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AcquisitionChart({ data, loading = false }) {
  const [viewType, setViewType] = useState('pie'); // 'pie' or 'bar'
  const [activeIndex, setActiveIndex] = useState(null);
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-80 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }
  
  // Transform data
  const chartData = data?.data?.rows?.map((row, index) => {
    const channel = row.dimensionValues[0]?.value || 'Unknown';
    const users = parseInt(row.metricValues[0]?.value || 0);
    const sessions = parseInt(row.metricValues[1]?.value || 0);
    
    return {
      channel,
      users,
      sessions,
      color: COLORS[index % COLORS.length]
    };
  }) || [];
  
  // Calculate percentages
  const totalUsers = chartData.reduce((sum, item) => sum + item.users, 0);
  const chartDataWithPercentage = chartData.map(item => ({
    ...item,
    percentage: totalUsers > 0 ? ((item.users / totalUsers) * 100).toFixed(1) : 0
  }));
  
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };
  
  if (!chartDataWithPercentage || chartDataWithPercentage.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
        <div className="flex items-center justify-center h-80 text-gray-500">
          <div className="text-center">
            <Share2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No acquisition data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
          <p className="text-sm text-gray-600 mt-1">User acquisition by channel</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewType('pie')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              viewType === 'pie' 
                ? 'bg-blue-100 text-blue-600 font-medium' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => setViewType('bar')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              viewType === 'bar' 
                ? 'bg-blue-100 text-blue-600 font-medium' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Bar Chart
          </button>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartDataWithPercentage}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="users"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartDataWithPercentage.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => {
                  const item = chartDataWithPercentage.find(d => d.channel === value);
                  return `${value} (${item?.percentage}%)`;
                }}
              />
            </PieChart>
          ) : (
            <BarChart
              data={chartDataWithPercentage}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="channel" 
                stroke="#9CA3AF"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="users" name="Users" radius={[8, 8, 0, 0]}>
                {chartDataWithPercentage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {/* Channel Details */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartDataWithPercentage.slice(0, 6).map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.channel}</p>
                <p className="text-xs text-gray-600">
                  {item.users.toLocaleString()} users ({item.percentage}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top Channel Stats */}
      {chartDataWithPercentage.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Top Channel</p>
              <p className="text-lg font-bold text-gray-900">{chartDataWithPercentage[0].channel}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 mb-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">Top Users</p>
              <p className="text-lg font-bold text-gray-900">
                {chartDataWithPercentage[0].users.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-2">
                <MousePointerClick className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Top Sessions</p>
              <p className="text-lg font-bold text-gray-900">
                {chartDataWithPercentage[0].sessions.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
