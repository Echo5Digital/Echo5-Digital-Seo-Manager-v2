import { useState, useMemo } from 'react';
import RankBadge from './RankBadge';
import TrendIndicator from './TrendIndicator';
import MiniLineChart from './MiniLineChart';

/**
 * KeywordTable Component
 * Enhanced table with search, filters, sorting, and pagination
 */
export default function KeywordTable({ data, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrend, setFilterTrend] = useState('all');
  const [sortBy, setSortBy] = useState('change');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('detailed');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [expandedRow, setExpandedRow] = useState(null);

  if (!data || !data.keywordTimeline) {
    return null;
  }

  // Filter and sort keywords
  const processedKeywords = useMemo(() => {
    let keywords = [...data.keywordTimeline];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      keywords = keywords.filter(k =>
        k.keyword.toLowerCase().includes(query)
      );
    }

    // Apply trend filter
    if (filterTrend !== 'all') {
      keywords = keywords.filter(k => k.trend === filterTrend);
    }

    // Apply sorting
    keywords.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'keyword':
          comparison = a.keyword.localeCompare(b.keyword);
          break;
        case 'currentRank':
          comparison = (a.currentRank || 999) - (b.currentRank || 999);
          break;
        case 'change':
          comparison = (b.totalChange || 0) - (a.totalChange || 0);
          break;
        case 'trend':
          const trendOrder = { improved: 1, stable: 2, declined: 3, new: 4 };
          comparison = (trendOrder[a.trend] || 5) - (trendOrder[b.trend] || 5);
          break;
        case 'bestRank':
          comparison = (a.bestRank || 999) - (b.bestRank || 999);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return keywords;
  }, [data.keywordTimeline, searchQuery, filterTrend, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedKeywords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, processedKeywords.length);
  const paginatedKeywords = processedKeywords.slice(startIndex, endIndex);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header with filters */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Keyword Rankings</h3>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
              {processedKeywords.length} keywords
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Trend Filter */}
            <select
              value={filterTrend}
              onChange={(e) => setFilterTrend(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Trends</option>
              <option value="improved">Improved</option>
              <option value="declined">Declined</option>
              <option value="stable">Stable</option>
              <option value="new">New</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('compact')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'compact' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'detailed' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'
                }`}
              >
                Detailed
              </button>
            </div>

            {/* Export Button */}
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('keyword')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Keyword
                  <SortIcon field="keyword" />
                </button>
              </th>
              <th className="px-4 py-3 text-center">
                <button
                  onClick={() => handleSort('currentRank')}
                  className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 mx-auto"
                >
                  Current
                  <SortIcon field="currentRank" />
                </button>
              </th>
              <th className="px-4 py-3 text-center">
                <button
                  onClick={() => handleSort('change')}
                  className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 mx-auto"
                >
                  Change
                  <SortIcon field="change" />
                </button>
              </th>
              {viewMode === 'detailed' && (
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('bestRank')}
                    className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 mx-auto"
                  >
                    Best/Worst
                    <SortIcon field="bestRank" />
                  </button>
                </th>
              )}
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('trend')}
                  className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 mx-auto"
                >
                  Trend
                  <SortIcon field="trend" />
                </button>
              </th>
              {viewMode === 'detailed' && (
                <th className="px-4 py-3 text-center">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                    12M History
                  </div>
                </th>
              )}
              <th className="px-4 py-3 text-right">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedKeywords.map((kw, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{kw.keyword}</div>
                      {kw.averageRank && (
                        <div className="text-xs text-gray-500">
                          Avg: #{kw.averageRank}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 text-center">
                  <RankBadge rank={kw.currentRank} size="md" showIcon={kw.currentRank <= 3} />
                </td>

                <td className="px-4 py-4 text-center">
                  <TrendIndicator change={kw.totalChange} size="md" />
                </td>

                {viewMode === 'detailed' && (
                  <td className="px-4 py-4 text-center">
                    <div className="text-xs space-y-0.5">
                      <div className="text-green-600 font-semibold">
                        Best: {kw.bestRank ? `#${kw.bestRank}` : '-'}
                      </div>
                      <div className="text-red-600">
                        Worst: {kw.worstRank ? `#${kw.worstRank}` : '-'}
                      </div>
                    </div>
                  </td>
                )}

                <td className="px-4 py-4 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    kw.trend === 'improved' ? 'bg-green-100 text-green-800' :
                    kw.trend === 'declined' ? 'bg-red-100 text-red-800' :
                    kw.trend === 'stable' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {kw.trend === 'improved' && '↗️ '}
                    {kw.trend === 'declined' && '↘️ '}
                    {kw.trend === 'stable' && '→ '}
                    {kw.trend === 'new' && '✨ '}
                    {kw.trend.charAt(0).toUpperCase() + kw.trend.slice(1)}
                  </span>
                </td>

                {viewMode === 'detailed' && (
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <MiniLineChart
                        data={kw.history.map(h => h.rank).filter(r => r)}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </td>
                )}

                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="View details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {onRefresh && (
                      <button
                        onClick={() => onRefresh(kw)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Refresh rank"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {processedKeywords.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No keywords found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Showing {startIndex + 1} to {endIndex} of {processedKeywords.length} keywords
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
