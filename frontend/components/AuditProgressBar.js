import useAuditStore from '../store/audits'

export default function AuditProgressBar() {
  const auditProgress = useAuditStore(state => state.auditProgress)

  const getCurrentStepIndex = () => {
    return Math.floor((auditProgress.progress / 100) * auditProgress.steps.length) - 1
  }

  const funFacts = [
    "75% of users never scroll past the first page of search results.",
    "Page loading speed affects both user experience and SEO rankings.",
    "Mobile-first indexing means Google primarily uses mobile content for ranking.",
    "Quality backlinks are still one of the top ranking factors.",
    "Alt text for images helps both accessibility and SEO.",
    "Internal linking helps search engines understand your site structure.",
    "Meta descriptions don't directly affect rankings but improve click-through rates.",
    "Schema markup can enhance your search result appearance.",
    "Core Web Vitals are now official Google ranking factors.",
    "HTTPS is a confirmed Google ranking signal.",
    "Fresh content can help improve search rankings over time.",
    "Long-tail keywords often have higher conversion rates.",
    "User experience signals are becoming increasingly important for SEO.",
    "Voice search optimization is growing in importance.",
    "Local SEO helps businesses appear in 'near me' searches."
  ]

  const getCurrentFunFact = () => {
    const index = Math.floor((auditProgress.progress / 100) * funFacts.length)
    return funFacts[Math.min(index, funFacts.length - 1)]
  }

  if (!auditProgress.isRunning) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <img 
              src="/echo5-loading.gif" 
              alt="Running SEO Audit" 
              className="w-60 max-w-sm h-auto object-contain"
              style={{ aspectRatio: '16/9' }}
            />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Running SEO Audit</h3>
          <p className="text-gray-500">Analyzing your website SEO performance...</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Progress</span>
            <span className="font-bold text-blue-600">{Math.round(auditProgress.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out relative transform-gpu"
              style={{ width: `${auditProgress.progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-shine"></div>
              <div className="absolute right-0 top-0 h-full w-4 bg-white opacity-60 blur-sm animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Current Step */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center text-gray-700 mb-4 bg-gray-50 rounded-lg p-3">
            <div className="w-6 h-6 mr-3 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            </div>
            <span className="font-medium text-sm">{auditProgress.step}</span>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center space-x-1 mb-4">
            {auditProgress.steps.map((step, index) => (
              <div 
                key={index}
                className={`transition-all duration-500 ease-out ${
                  index <= getCurrentStepIndex()
                    ? 'w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 scale-110 shadow-lg'
                    : 'w-2 h-2 rounded-full bg-gray-300'
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-l-4 border-blue-400">
          <div className="text-sm">
            <div className="flex items-center mb-2">
              <span className="text-xl mr-2">💡</span>
              <span className="font-semibold text-blue-800">SEO Tip</span>
            </div>
            <p className="text-blue-700 leading-relaxed">{getCurrentFunFact()}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(300%) skewX(-12deg);
          }
        }

        .animate-shine {
          animation: shine 2s infinite;
        }
      `}</style>
    </div>
  )
}
