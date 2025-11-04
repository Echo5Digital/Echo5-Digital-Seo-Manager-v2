import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * TrendChart Component
 * Interactive line chart showing keyword ranking trends
 */
export default function TrendChart({ data, onKeywordSelect }) {
  const [filterView, setFilterView] = useState('All');
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  // Color palette for different keywords
  const colors = [
    { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
    { border: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
    { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  ];

  useEffect(() => {
    if (!data || !data.keywordTimeline) return;

    // Auto-select top 5 keywords by default
    const autoSelect = data.keywordTimeline
      .filter(k => k.currentRank && k.currentRank <= 50)
      .sort((a, b) => a.currentRank - b.currentRank)
      .slice(0, 5)
      .map(k => k.keyword);
    
    setSelectedKeywords(autoSelect);
  }, [data]);

  if (!data || !data.keywordTimeline || !data.monthlyStats) {
    return null;
  }

  // Filter keywords based on view
  const getFilteredKeywords = () => {
    let filtered = data.keywordTimeline;

    switch (filterView) {
      case 'Top 10':
        filtered = filtered.filter(k => k.currentRank && k.currentRank <= 10);
        break;
      case 'Improved':
        filtered = filtered.filter(k => k.trend === 'improved');
        break;
      case 'Declined':
        filtered = filtered.filter(k => k.trend === 'declined');
        break;
      default:
        // All
        break;
    }

    return filtered;
  };

  const filteredKeywords = getFilteredKeywords();

  // Prepare chart data
  const monthLabels = data.monthlyStats
    .map(m => m.monthName)
    .reverse(); // Oldest to newest for chart

  const datasets = selectedKeywords
    .map((keyword, idx) => {
      const kwData = data.keywordTimeline.find(k => k.keyword === keyword);
      if (!kwData) return null;

      const color = colors[idx % colors.length];
      const monthlyRanks = kwData.history.map(h => h.rank || null);

      return {
        label: keyword,
        data: monthlyRanks,
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color.border,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      };
    })
    .filter(Boolean);

  const chartData = {
    labels: monthLabels,
    datasets: datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // We'll show custom legend below
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return value ? `${label}: #${value}` : `${label}: Not ranked`;
          }
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        reverse: true, // Lower rank is better
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return '#' + value;
          },
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: 'Ranking Position (lower is better)',
          color: '#6b7280',
          font: {
            size: 12,
          }
        }
      },
      x: {
        ticks: {
          color: '#6b7280',
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const toggleKeyword = (keyword) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else {
      if (selectedKeywords.length >= 8) {
        alert('Maximum 8 keywords can be displayed at once');
        return;
      }
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ranking Trends</h3>
          <p className="text-sm text-gray-500">12-month performance overview</p>
        </div>
        <div className="flex gap-2">
          {['All', 'Top 10', 'Improved', 'Declined'].map(view => (
            <button
              key={view}
              onClick={() => setFilterView(view)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filterView === view
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        {datasets.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900">Select keywords to display</p>
              <p className="text-sm text-gray-500">Click on keywords below to add them to the chart</p>
            </div>
          </div>
        )}
      </div>

      {/* Keyword Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            Select Keywords ({selectedKeywords.length}/8)
          </h4>
          {selectedKeywords.length > 0 && (
            <button
              onClick={() => setSelectedKeywords([])}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {filteredKeywords.map((kw, idx) => {
            const isSelected = selectedKeywords.includes(kw.keyword);
            const colorIdx = selectedKeywords.indexOf(kw.keyword);
            const color = colorIdx >= 0 ? colors[colorIdx % colors.length] : null;

            return (
              <button
                key={idx}
                onClick={() => toggleKeyword(kw.keyword)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-white border-2 shadow-sm'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                style={isSelected ? { borderColor: color.border } : {}}
              >
                {isSelected && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color.border }}
                  />
                )}
                <span className={isSelected ? 'font-medium text-gray-900' : 'text-gray-600'}>
                  {kw.keyword}
                </span>
                {kw.currentRank && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    kw.currentRank <= 10 ? 'bg-green-100 text-green-700' :
                    kw.currentRank <= 30 ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    #{kw.currentRank}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
