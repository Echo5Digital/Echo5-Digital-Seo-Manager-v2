import React, { useState } from 'react';
import { 
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Globe, Monitor, Chrome, MapPin } from 'lucide-react';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-600">Users:</span>
          <span className="text-sm font-semibold">{data.users.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-600">Sessions:</span>
          <span className="text-sm font-semibold">{data.sessions.toLocaleString()}</span>
        </div>
        {data.percentage && (
          <div className="flex justify-between gap-4">
            <span className="text-sm text-gray-600">Share:</span>
            <span className="text-sm font-semibold">{data.percentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function DemographicsChart({ data, loading = false }) {
  const [activeTab, setActiveTab] = useState('country'); // 'country', 'city', 'device', 'browser'
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-80 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }
  
  // Transform data based on active tab
  const transformData = (dimensionIndex) => {
    if (!data?.data?.rows) return [];
    
    return data.data.rows
      .map((row) => {
        const name = row.dimensionValues[dimensionIndex]?.value || 'Unknown';
        const users = parseInt(row.metricValues[0]?.value || 0);
        const sessions = parseInt(row.metricValues[1]?.value || 0);
        
        return { name, users, sessions };
      })
      .slice(0, 10); // Top 10
  };
  
  const getChartData = () => {
    switch (activeTab) {
      case 'country':
        return transformData(0);
      case 'city':
        return transformData(1);
      case 'device':
        return transformData(2);
      case 'browser':
        return transformData(3);
      default:
        return [];
    }
  };
  
  const chartData = getChartData();
  
  // Calculate percentages
  const totalUsers = chartData.reduce((sum, item) => sum + item.users, 0);
  const chartDataWithPercentage = chartData.map((item, index) => ({
    ...item,
    percentage: totalUsers > 0 ? ((item.users / totalUsers) * 100).toFixed(1) : 0,
    color: COLORS[index % COLORS.length]
  }));
  
  const tabs = [
    { id: 'country', label: 'Countries', icon: Globe },
    { id: 'city', label: 'Cities', icon: MapPin },
    { id: 'device', label: 'Devices', icon: Monitor },
    { id: 'browser', label: 'Browsers', icon: Chrome }
  ];
  
  if (!data?.data?.rows || data.data.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audience Demographics</h3>
        <div className="flex items-center justify-center h-80 text-gray-500">
          <div className="text-center">
            <Globe className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No demographic data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Audience Demographics</h3>
        <p className="text-sm text-gray-600 mt-1">Geographic and technology breakdown</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Horizontal Bar Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartDataWithPercentage}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#9CA3AF" 
              fontSize={12}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="users" name="Users" radius={[0, 4, 4, 0]}>
              {chartDataWithPercentage.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Detailed List */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="space-y-2">
          {chartDataWithPercentage.map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                  {index + 1}
                </div>
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-gray-900">{item.name}</span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Users</p>
                  <p className="text-lg font-bold text-gray-900">{item.users.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Sessions</p>
                  <p className="text-lg font-bold text-gray-900">{item.sessions.toLocaleString()}</p>
                </div>
                <div className="text-right min-w-[60px]">
                  <p className="text-sm text-gray-600">Share</p>
                  <p className="text-lg font-bold text-blue-600">{item.percentage}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary Stats */}
      {chartDataWithPercentage.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Top {activeTab}</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {chartDataWithPercentage[0].name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Top Users</p>
              <p className="text-lg font-bold text-gray-900">
                {chartDataWithPercentage[0].users.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total {activeTab}s</p>
              <p className="text-lg font-bold text-gray-900">
                {chartDataWithPercentage.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-lg font-bold text-gray-900">
                {totalUsers.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
