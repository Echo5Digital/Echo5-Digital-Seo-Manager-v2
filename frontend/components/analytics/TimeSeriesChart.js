import React, { useState } from 'react';
import { 
  LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Brush, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, BarChart2, Activity } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <span className="text-sm" style={{ color: entry.color }}>
            {entry.name}:
          </span>
          <span className="text-sm font-semibold">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function TimeSeriesChart({ data, loading = false }) {
  const [chartType, setChartType] = useState('area'); // 'area', 'line', 'composed'
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-80 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }
  
  // Transform data
  const chartData = data?.data?.rows?.map((row) => {
    const dateStr = row.dimensionValues[0]?.value || '';
    let formattedDate = dateStr;
    
    try {
      if (dateStr.length === 8) {
        // Format: YYYYMMDD
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        formattedDate = format(new Date(year, month - 1, day), 'MMM d');
      }
    } catch (e) {
      formattedDate = dateStr;
    }
    
    return {
      date: formattedDate,
      users: parseInt(row.metricValues[0]?.value || 0),
      sessions: parseInt(row.metricValues[1]?.value || 0),
      engagedSessions: parseInt(row.metricValues[2]?.value || 0),
      pageViews: parseInt(row.metricValues[3]?.value || 0),
      conversions: parseInt(row.metricValues[4]?.value || 0),
      bounceRate: parseFloat(row.metricValues[5]?.value || 0) * 100
    };
  }) || [];
  
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };
    
    const xAxisProps = {
      dataKey: 'date',
      stroke: '#9CA3AF',
      fontSize: 12
    };
    
    const yAxisProps = {
      stroke: '#9CA3AF',
      fontSize: 12
    };
    
    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="users" 
              name="Users"
              stroke="#3B82F6" 
              fillOpacity={1}
              fill="url(#colorUsers)"
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="sessions" 
              name="Sessions"
              stroke="#8B5CF6" 
              fillOpacity={1}
              fill="url(#colorSessions)"
              strokeWidth={2}
            />
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="#3B82F6"
              fill="#F3F4F6"
            />
          </AreaChart>
        );
      
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="users" 
              name="Users"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="sessions" 
              name="Sessions"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ fill: '#8B5CF6', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="pageViews" 
              name="Page Views"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        );
      
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} yAxisId="left" />
            <YAxis {...yAxisProps} yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="sessions" 
              name="Sessions"
              fill="#E0E7FF"
              stroke="#3B82F6"
              yAxisId="left"
            />
            <Line 
              type="monotone" 
              dataKey="conversions" 
              name="Conversions"
              stroke="#F59E0B"
              strokeWidth={3}
              yAxisId="right"
              dot={{ fill: '#F59E0B', r: 4 }}
            />
          </ComposedChart>
        );
      
      default:
        return null;
    }
  };
  
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Trends</h3>
        <div className="flex items-center justify-center h-80 text-gray-500">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No trend data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Traffic Trends</h3>
          <p className="text-sm text-gray-600 mt-1">Users and sessions over time</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('area')}
            className={`p-2 rounded-lg ${
              chartType === 'area' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Area Chart"
          >
            <BarChart2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg ${
              chartType === 'line' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Line Chart"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType('composed')}
            className={`p-2 rounded-lg ${
              chartType === 'composed' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Composed Chart"
          >
            <Activity className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
        <div>
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-xl font-bold text-gray-900">
            {chartData.reduce((sum, d) => sum + d.users, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Sessions</p>
          <p className="text-xl font-bold text-gray-900">
            {chartData.reduce((sum, d) => sum + d.sessions, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Avg. Daily Users</p>
          <p className="text-xl font-bold text-gray-900">
            {Math.round(chartData.reduce((sum, d) => sum + d.users, 0) / chartData.length).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Conversions</p>
          <p className="text-xl font-bold text-gray-900">
            {chartData.reduce((sum, d) => sum + d.conversions, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
