import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = 'from-blue-500 to-blue-600', 
  loading = false,
  sparklineData = null 
}) {
  const isPositive = change >= 0;
  
  // Generate simple sparkline data if not provided
  const defaultSparkline = Array.from({ length: 7 }, (_, i) => ({
    value: Math.random() * 100 + 50
  }));
  
  const sparkline = sparklineData || defaultSparkline;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, shadow: 'lg' }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {change !== undefined && change !== null && (
                <div className="flex items-center mt-2">
                  {isPositive ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs previous</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      
      {/* Sparkline */}
      {!loading && sparkline && (
        <div className="h-12 -mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isPositive ? '#10B981' : '#EF4444'}
                fill={`url(#gradient-${title})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
