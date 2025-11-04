import { useState, useEffect } from 'react';

/**
 * InsightsPanel Component
 * AI-powered insights and recommendations
 */
export default function InsightsPanel({ data }) {
  const [insights, setInsights] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (data) {
      generateInsights();
    }
  }, [data]);

  const generateInsights = () => {
    if (!data) return;

    const newInsights = [];
    const { summary, keywordTimeline, performanceCategories } = data;

    // Insight 1: Top performing keywords
    if (performanceCategories?.topPerformers > 0) {
      const topKeywords = keywordTimeline
        .filter(k => k.trend === 'improved' && k.currentRank && k.currentRank <= 30)
        .slice(0, 3)
        .map(k => k.keyword)
        .join(', ');

      newInsights.push({
        type: 'success',
        icon: 'TrendingUpIcon',
        title: `${performanceCategories.topPerformers} keywords showing strong improvement`,
        description: topKeywords ? `Great progress on: ${topKeywords}` : 'Keep up the momentum with your current SEO strategy.',
        actionText: null,
      });
    }

    // Insight 2: Keywords needing attention
    if (performanceCategories?.needAttention > 0) {
      newInsights.push({
        type: 'warning',
        icon: 'ExclamationIcon',
        title: `${performanceCategories.needAttention} keywords require immediate attention`,
        description: 'These keywords are either declining or ranking below position 50. Consider content updates or backlink building.',
        actionText: 'View Keywords',
        action: () => console.log('View needing attention'),
      });
    }

    // Insight 3: Lost visibility
    if (performanceCategories?.lostVisibility > 0) {
      newInsights.push({
        type: 'danger',
        icon: 'XCircleIcon',
        title: `${performanceCategories.lostVisibility} keywords lost rankings`,
        description: 'These keywords previously ranked but are now out of top 100. Urgent action needed to recover positions.',
        actionText: 'Analyze Issues',
        action: () => console.log('Analyze lost visibility'),
      });
    }

    // Insight 4: Improvement ratio
    const improvementRatio = summary.improved / (summary.improved + summary.declined || 1);
    if (improvementRatio > 0.6) {
      newInsights.push({
        type: 'success',
        icon: 'CheckCircleIcon',
        title: 'Overall positive trend detected',
        description: `${Math.round(improvementRatio * 100)}% of changing keywords are improving. Your SEO efforts are paying off!`,
        actionText: null,
      });
    } else if (improvementRatio < 0.4) {
      newInsights.push({
        type: 'warning',
        icon: 'TrendingDownIcon',
        title: 'More keywords declining than improving',
        description: `${Math.round((1 - improvementRatio) * 100)}% of changes are negative. Consider reviewing your content strategy and technical SEO.`,
        actionText: 'Get Recommendations',
      });
    }

    // Insight 5: Stable keywords opportunity
    if (performanceCategories?.stable > 10) {
      newInsights.push({
        type: 'info',
        icon: 'LightBulbIcon',
        title: `${performanceCategories.stable} keywords with stable rankings`,
        description: 'These keywords could be optimized further to break into higher positions. Consider enhancing content quality.',
        actionText: 'See Opportunities',
      });
    }

    // Insight 6: New keywords tracking
    if (summary.new > 0) {
      newInsights.push({
        type: 'info',
        icon: 'SparklesIcon',
        title: `${summary.new} new keywords tracked this period`,
        description: 'Monitor these closely over the next few weeks to establish baseline performance.',
        actionText: null,
      });
    }

    setInsights(newInsights);
  };

  const IconComponent = ({ name }) => {
    const icons = {
      TrendingUpIcon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      ExclamationIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      XCircleIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      CheckCircleIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      TrendingDownIcon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
      LightBulbIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
        </svg>
      ),
      SparklesIcon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    };
    return icons[name] || null;
  };

  if (!data || insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
          <p className="text-sm text-gray-600">Personalized recommendations based on your ranking data</p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-lg p-4 border-l-4 ${
              insight.type === 'success' ? 'border-green-500' :
              insight.type === 'warning' ? 'border-yellow-500' :
              insight.type === 'danger' ? 'border-red-500' :
              'border-blue-500'
            } shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 ${
                insight.type === 'success' ? 'text-green-600' :
                insight.type === 'warning' ? 'text-yellow-600' :
                insight.type === 'danger' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                <IconComponent name={insight.icon} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                {insight.actionText && (
                  <button
                    onClick={insight.action}
                    className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    {insight.actionText}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={generateInsights}
        disabled={generating}
        className="mt-4 w-full py-2 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
      >
        {generating ? 'Generating...' : '🔄 Refresh Insights'}
      </button>
    </div>
  );
}
