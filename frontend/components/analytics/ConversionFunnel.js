import React from 'react';
import { motion } from 'framer-motion';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, Target, MousePointerClick, ShoppingCart, DollarSign } from 'lucide-react';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-600">Count:</span>
          <span className="text-sm font-semibold">{data.value.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-600">Conversion:</span>
          <span className="text-sm font-semibold">{data.percentage}%</span>
        </div>
        {data.dropOff && (
          <div className="flex justify-between gap-4">
            <span className="text-sm text-gray-600">Drop-off:</span>
            <span className="text-sm font-semibold text-red-600">{data.dropOff}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StageIcon = ({ stage }) => {
  const icons = {
    'Sessions': MousePointerClick,
    'Engaged Sessions': Target,
    'Add to Cart': ShoppingCart,
    'Begin Checkout': ShoppingCart,
    'Purchase': DollarSign
  };
  
  const Icon = icons[stage] || MousePointerClick;
  return <Icon className="h-5 w-5" />;
};

export default function ConversionFunnel({ data, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-96 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }
  
  // Transform data for funnel
  const funnelData = data?.data?.rows?.map((row) => {
    const eventName = row.dimensionValues[0]?.value || 'Unknown';
    const eventCount = parseInt(row.metricValues[0]?.value || 0);
    
    return {
      name: eventName,
      value: eventCount
    };
  }) || [];
  
  // Sort by value descending to create funnel shape
  funnelData.sort((a, b) => b.value - a.value);
  
  // Calculate conversion rates and drop-offs
  const totalStarters = funnelData[0]?.value || 1;
  const enrichedData = funnelData.map((item, index) => {
    const percentage = ((item.value / totalStarters) * 100).toFixed(1);
    let dropOff = null;
    
    if (index > 0) {
      const prevValue = funnelData[index - 1].value;
      dropOff = (((prevValue - item.value) / prevValue) * 100).toFixed(1);
    }
    
    return {
      ...item,
      percentage,
      dropOff,
      fill: COLORS[index % COLORS.length]
    };
  });
  
  if (!enrichedData || enrichedData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <TrendingDown className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No conversion data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Conversion Funnel</h3>
        <p className="text-sm text-gray-600 mt-1">User journey through conversion events</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Chart */}
        <div className="lg:col-span-2 h-96">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip content={<CustomTooltip />} />
              <Funnel
                dataKey="value"
                data={enrichedData}
                isAnimationActive
              >
                <LabelList 
                  position="center" 
                  fill="#fff" 
                  stroke="none" 
                  dataKey="name"
                  style={{ fontSize: '14px', fontWeight: 'bold' }}
                />
                {enrichedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
        
        {/* Stage Details */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 mb-4">Funnel Stages</h4>
          {enrichedData.map((stage, index) => (
            <motion.div
              key={index}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${stage.fill}20` }}
                >
                  <StageIcon stage={stage.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {stage.name}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900">
                      {stage.value.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      ({stage.percentage}%)
                    </p>
                  </div>
                  {stage.dropOff && (
                    <p className="text-xs text-red-600 mt-1">
                      ↓ {stage.dropOff}% drop-off
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Conversion Metrics */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2">
              <MousePointerClick className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Starting Point</p>
            <p className="text-xl font-bold text-gray-900">
              {enrichedData[0]?.value.toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-2">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Conversions</p>
            <p className="text-xl font-bold text-gray-900">
              {enrichedData[enrichedData.length - 1]?.value.toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 mb-2">
              <TrendingDown className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-xl font-bold text-gray-900">
              {enrichedData[enrichedData.length - 1]?.percentage}%
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 mb-2">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Funnel Steps</p>
            <p className="text-xl font-bold text-gray-900">
              {enrichedData.length}
            </p>
          </div>
        </div>
      </div>
      
      {/* Optimization Insights */}
      {enrichedData.length > 1 && (
        <div className="mt-6">
          {(() => {
            const maxDropOff = enrichedData
              .filter(stage => stage.dropOff)
              .reduce((max, stage) => 
                parseFloat(stage.dropOff) > parseFloat(max.dropOff || 0) ? stage : max
              , { dropOff: 0 });
            
            if (parseFloat(maxDropOff.dropOff) > 50) {
              return (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <TrendingDown className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        High Drop-off Detected
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        {maxDropOff.dropOff}% of users drop off at "{maxDropOff.name}". 
                        Consider optimizing this step to improve conversion rates.
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            }
            
            return null;
          })()}
        </div>
      )}
    </div>
  );
}
