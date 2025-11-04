import MiniSparkline from './MiniSparkline';
import TrendIndicator from './TrendIndicator';
import { format } from 'date-fns';

/**
 * SummaryCards Component
 * Dashboard summary cards showing key metrics
 */
export default function SummaryCards({ data }) {
  if (!data || !data.summary) {
    return null;
  }

  const { summary, monthlyStats, keywordTimeline, performanceCategories } = data;

  // Calculate average rank trend
  const avgRanks = monthlyStats?.map(m => parseFloat(m.averageRank) || 0).filter(r => r > 0) || [];
  const currentAvgRank = avgRanks[avgRanks.length - 1] || 0;
  const previousAvgRank = avgRanks[avgRanks.length - 2] || currentAvgRank;
  const rankImprovement = previousAvgRank > 0 ? ((previousAvgRank - currentAvgRank) / previousAvgRank * 100).toFixed(1) : 0;

  // Get top 3 keywords
  const topKeywords = keywordTimeline
    ?.filter(k => k.currentRank && k.currentRank <= 10)
    .sort((a, b) => a.currentRank - b.currentRank)
    .slice(0, 3)
    .map(k => k.keyword) || [];

  // Weekly activity (last 4 weeks based on monthlyStats)
  const recentChecks = monthlyStats?.slice(0, 4).map(m => ({
    month: m.monthName,
    checked: m.stats?.totalChecks > 0 || m.totalKeywords > 0,
    date: m.monthKey
  })) || [];

  // Last check date
  const lastCheckDate = monthlyStats?.[0]?.monthName || 'N/A';
  const totalChecks = monthlyStats?.reduce((sum, m) => sum + (m.stats?.totalChecks || 0), 0) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Average Performance Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Avg. Ranking</span>
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-3xl font-bold text-gray-900">
            {currentAvgRank > 0 ? `#${currentAvgRank.toFixed(1)}` : 'N/A'}
          </span>
          {rankImprovement !== 0 && (
            <span className={`text-sm font-semibold px-2 py-1 rounded ${
              rankImprovement > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {rankImprovement > 0 ? '↑' : '↓'} {Math.abs(rankImprovement)}%
            </span>
          )}
        </div>
        <div className="h-12">
          <MiniSparkline data={avgRanks.reverse()} color="indigo" />
        </div>
      </div>

      {/* Top Performers Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-emerald-700">Top Performers</span>
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-3xl font-bold text-emerald-900">
            {performanceCategories?.topPerformers || 0}
          </div>
          <span className="text-sm text-emerald-600">keywords</span>
        </div>
        <div className="text-xs text-emerald-600 mb-3">
          Improved & ranking in top 30
        </div>
        {topKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topKeywords.map((kw, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white border border-emerald-200 text-emerald-700"
                title={kw}
              >
                {kw.length > 12 ? kw.substring(0, 12) + '...' : kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Need Attention Card */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-sm border border-red-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-red-700">Need Attention</span>
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-3xl font-bold text-red-900">
            {performanceCategories?.needAttention || 0}
          </div>
          <span className="text-sm text-red-600">keywords</span>
        </div>
        <div className="text-xs text-red-600 mb-3">
          Declining or ranking below 50
        </div>
        {(performanceCategories?.needAttention || 0) > 0 && (
          <button className="text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1">
            View Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Weekly Activity Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-blue-700">Tracking Activity</span>
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-3xl font-bold text-blue-900">{totalChecks}</div>
          <span className="text-sm text-blue-600">checks</span>
        </div>
        <div className="text-xs text-blue-600 mb-3">
          Last: {lastCheckDate}
        </div>
        <div className="flex gap-1">
          {recentChecks.map((check, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full transition-all ${
                check.checked ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              title={check.month}
            />
          ))}
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="col-span-full grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Improved</span>
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-600">{summary.improved}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Declined</span>
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-red-600">{summary.declined}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Stable</span>
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-600">{summary.unchanged}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">New</span>
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-blue-600">{summary.new}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Lost</span>
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-orange-600">{summary.lost}</div>
        </div>
      </div>
    </div>
  );
}
