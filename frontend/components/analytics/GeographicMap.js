import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { MapPin, Globe, TrendingUp } from 'lucide-react';

// World map topology URL
const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

// Country code mapping (ISO Alpha-3 to common names)
const countryCodeMap = {
  'United States': 'USA',
  'United Kingdom': 'GBR',
  'India': 'IND',
  'Canada': 'CAN',
  'Australia': 'AUS',
  'Germany': 'DEU',
  'France': 'FRA',
  'Japan': 'JPN',
  'China': 'CHN',
  'Brazil': 'BRA',
  'Mexico': 'MEX',
  'Spain': 'ESP',
  'Italy': 'ITA',
  'Netherlands': 'NLD',
  'Singapore': 'SGP',
  'South Korea': 'KOR',
  'Russia': 'RUS',
  'South Africa': 'ZAF',
  'New Zealand': 'NZL',
  'Sweden': 'SWE',
  'Norway': 'NOR',
  'Denmark': 'DNK',
  'Finland': 'FIN',
  'Poland': 'POL',
  'Switzerland': 'CHE',
  'Austria': 'AUT',
  'Belgium': 'BEL',
  'Ireland': 'IRL',
  'Portugal': 'PRT',
  'Greece': 'GRC',
  'Turkey': 'TUR',
  'United Arab Emirates': 'ARE',
  'Saudi Arabia': 'SAU',
  'Israel': 'ISR',
  'Egypt': 'EGY',
  'Argentina': 'ARG',
  'Chile': 'CHL',
  'Colombia': 'COL',
  'Peru': 'PER',
  'Venezuela': 'VEN',
  'Thailand': 'THA',
  'Vietnam': 'VNM',
  'Philippines': 'PHL',
  'Indonesia': 'IDN',
  'Malaysia': 'MYS',
  'Pakistan': 'PAK',
  'Bangladesh': 'BGD',
  'Nigeria': 'NGA',
  'Kenya': 'KEN',
  'Ghana': 'GHA'
};

const CountryTooltip = ({ country, users, sessions }) => (
  <div className="absolute z-50 bg-white p-3 rounded-lg shadow-xl border border-gray-200 pointer-events-none">
    <p className="font-semibold text-gray-900 mb-1">{country}</p>
    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-sm text-gray-600">Users:</span>
        <span className="text-sm font-semibold">{users.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-sm text-gray-600">Sessions:</span>
        <span className="text-sm font-semibold">{sessions.toLocaleString()}</span>
      </div>
    </div>
  </div>
);

export default function GeographicMap({ data, loading = false }) {
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-96 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }
  
  // Transform data
  const countryData = useMemo(() => {
    if (!data?.data?.rows) return {};
    
    const dataMap = {};
    data.data.rows.forEach(row => {
      const country = row.dimensionValues[0]?.value;
      const users = parseInt(row.metricValues[0]?.value || 0);
      const sessions = parseInt(row.metricValues[1]?.value || 0);
      
      if (country && country !== '(not set)') {
        const countryCode = countryCodeMap[country];
        if (countryCode) {
          dataMap[countryCode] = { country, users, sessions };
        }
      }
    });
    
    return dataMap;
  }, [data]);
  
  const topCountries = useMemo(() => {
    return Object.values(countryData)
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
  }, [countryData]);
  
  // Color scale
  const maxUsers = useMemo(() => {
    const values = Object.values(countryData).map(d => d.users);
    return Math.max(...values, 1);
  }, [countryData]);
  
  const colorScale = scaleLinear()
    .domain([0, maxUsers])
    .range(['#DBEAFE', '#1E40AF']);
  
  const handleMouseEnter = (geo, event) => {
    const countryCode = geo.properties.ISO_A3;
    const countryInfo = countryData[countryCode];
    
    if (countryInfo) {
      setTooltipContent(countryInfo);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };
  
  const handleMouseLeave = () => {
    setTooltipContent(null);
  };
  
  if (!data?.data?.rows || data.data.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <Globe className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No geographic data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
        <p className="text-sm text-gray-600 mt-1">Users by country</p>
      </div>
      
      {/* World Map */}
      <div className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [0, 20]
          }}
          width={800}
          height={400}
        >
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryCode = geo.properties.ISO_A3;
                  const countryInfo = countryData[countryCode];
                  const fillColor = countryInfo 
                    ? colorScale(countryInfo.users)
                    : '#F3F4F6';
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillColor}
                      stroke="#E5E7EB"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { 
                          fill: countryInfo ? '#3B82F6' : '#E5E7EB',
                          outline: 'none',
                          cursor: countryInfo ? 'pointer' : 'default'
                        },
                        pressed: { outline: 'none' }
                      }}
                      onMouseEnter={(event) => handleMouseEnter(geo, event)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        
        {/* Color Legend */}
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Users</p>
          <div className="flex items-center gap-2">
            <div className="w-20 h-4 rounded" style={{
              background: 'linear-gradient(to right, #DBEAFE, #1E40AF)'
            }} />
            <div className="flex justify-between w-full text-xs text-gray-600">
              <span>0</span>
              <span>{maxUsers.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltipContent && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10
          }}
        >
          <CountryTooltip {...tooltipContent} />
        </div>
      )}
      
      {/* Top Countries List */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Top Countries
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topCountries.map((item, index) => (
            <motion.div
              key={item.country}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                  {index + 1}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{item.country}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-600">Users</p>
                  <p className="text-sm font-bold text-gray-900">{item.users.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Sessions</p>
                  <p className="text-sm font-bold text-gray-900">{item.sessions.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
