import { useState } from 'react';
import RankBadge from './RankBadge';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth } from 'date-fns';

/**
 * WeeklyView Component
 * Calendar-based view showing weekly rank checks
 */
export default function WeeklyView({ data }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedKeyword, setSelectedKeyword] = useState(null);

  if (!data || !data.keywordTimeline) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm text-gray-500 text-center">No weekly data available</p>
      </div>
    );
  }

  // Get all keywords with weekly data
  const keywordsWithWeeklyData = data.keywordTimeline.filter(kw => 
    kw.history.some(h => h.weeklyChecks && h.weeklyChecks.length > 0)
  );

  // Get weeks in selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

  // Get weekly checks for selected keyword
  const getWeeklyChecksForKeyword = (keyword) => {
    const kwData = data.keywordTimeline.find(k => k.keyword === keyword);
    if (!kwData) return [];

    const allWeeklyChecks = [];
    kwData.history.forEach(monthData => {
      if (monthData.weeklyChecks && monthData.weeklyChecks.length > 0) {
        monthData.weeklyChecks.forEach(check => {
          allWeeklyChecks.push({
            ...check,
            month: monthData.monthName,
            date: new Date(check.checkedAt)
          });
        });
      }
    });

    return allWeeklyChecks.sort((a, b) => b.date - a.date);
  };

  // Navigate months
  const previousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth.getMonth() === now.getMonth() && 
           selectedMonth.getFullYear() === now.getFullYear();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">📅 Weekly Rank Tracking</h3>
            <p className="text-sm text-gray-600">View weekly rank check history</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month Navigator */}
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-indigo-200">
              <button
                onClick={previousMonth}
                className="p-1 hover:bg-indigo-100 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-semibold text-gray-900 min-w-[120px] text-center">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth()}
                className="p-1 hover:bg-indigo-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setSelectedMonth(new Date())}
              className="px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Keyword Selector */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Keyword to View Weekly History
        </label>
        <select
          value={selectedKeyword || ''}
          onChange={(e) => setSelectedKeyword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">-- Select a keyword --</option>
          {keywordsWithWeeklyData.map((kw, idx) => (
            <option key={idx} value={kw.keyword}>
              {kw.keyword} {kw.currentRank ? `(Current: #${kw.currentRank})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Weekly Timeline View */}
      {selectedKeyword ? (
        <div className="p-6">
          {(() => {
            const weeklyChecks = getWeeklyChecksForKeyword(selectedKeyword);
            const currentMonthChecks = weeklyChecks.filter(check => 
              check.date.getMonth() === selectedMonth.getMonth() &&
              check.date.getFullYear() === selectedMonth.getFullYear()
            );

            if (currentMonthChecks.length === 0) {
              return (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No weekly checks for this month</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Stats for the month */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-600 font-medium mb-1">Total Checks</div>
                    <div className="text-2xl font-bold text-blue-900">{currentMonthChecks.length}</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-xs text-green-600 font-medium mb-1">Best Rank</div>
                    <div className="text-2xl font-bold text-green-900">
                      #{Math.min(...currentMonthChecks.filter(c => c.rank).map(c => c.rank))}
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="text-xs text-orange-600 font-medium mb-1">Worst Rank</div>
                    <div className="text-2xl font-bold text-orange-900">
                      #{Math.max(...currentMonthChecks.filter(c => c.rank).map(c => c.rank))}
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="text-xs text-purple-600 font-medium mb-1">Avg Rank</div>
                    <div className="text-2xl font-bold text-purple-900">
                      #{(currentMonthChecks.filter(c => c.rank).reduce((sum, c) => sum + c.rank, 0) / currentMonthChecks.filter(c => c.rank).length).toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Weekly Timeline */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Weekly Check History</h4>
                  {currentMonthChecks.map((check, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="flex-shrink-0 w-32">
                        <div className="text-sm font-semibold text-gray-900">
                          {format(check.date, 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(check.date, 'EEEE')}
                        </div>
                      </div>
                      
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Rank:</span>
                          <RankBadge rank={check.rank} size="md" showIcon={check.rank <= 10} />
                        </div>

                        {idx < currentMonthChecks.length - 1 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Change:</span>
                            {(() => {
                              const previousCheck = currentMonthChecks[idx + 1];
                              if (!previousCheck.rank || !check.rank) return <span className="text-xs text-gray-400">-</span>;
                              
                              const change = previousCheck.rank - check.rank;
                              return (
                                <span className={`text-sm font-semibold flex items-center gap-1 ${
                                  change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {change > 0 && '↑'}
                                  {change < 0 && '↓'}
                                  {change === 0 && '→'}
                                  {Math.abs(change)}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <div className="text-xs text-gray-400">
                          {format(check.date, 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show all-time stats */}
                {weeklyChecks.length > currentMonthChecks.length && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">All-Time Stats</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{weeklyChecks.length}</div>
                        <div className="text-xs text-gray-500">Total Checks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          #{Math.min(...weeklyChecks.filter(c => c.rank).map(c => c.rank))}
                        </div>
                        <div className="text-xs text-gray-500">Best Ever</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          #{(weeklyChecks.filter(c => c.rank).reduce((sum, c) => sum + c.rank, 0) / weeklyChecks.filter(c => c.rank).length).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">Avg Rank</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a keyword</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a keyword from the dropdown above to view its weekly ranking history
          </p>
        </div>
      )}
    </div>
  );
}
