/**
 * TrendIndicator Component
 * Shows trend direction with arrow and color
 */
export default function TrendIndicator({ change, showValue = true, size = 'md' }) {
  if (change === null || change === undefined || change === 0) {
    return (
      <span className={`flex items-center gap-1 text-gray-500 ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}>
        <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
        {showValue && <span className="font-medium">-</span>}
      </span>
    );
  }

  const isPositive = change > 0;

  return (
    <span className={`flex items-center gap-1 font-medium ${
      isPositive ? 'text-green-600' : 'text-red-600'
    } ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {isPositive ? (
        <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {showValue && <span>{isPositive ? '+' : ''}{Math.abs(change)}</span>}
    </span>
  );
}
