/**
 * RankBadge Component
 * Displays a color-coded badge for ranking positions
 */
export default function RankBadge({ rank, size = 'md', showIcon = false }) {
  if (!rank) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 ${
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'
      }`}>
        Not Ranked
      </span>
    );
  }

  const getColorClass = () => {
    if (rank <= 3) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (rank <= 10) return 'bg-green-100 text-green-800 border border-green-200';
    if (rank <= 30) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (rank <= 50) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (rank <= 100) return 'bg-orange-100 text-orange-800 border border-orange-200';
    return 'bg-red-100 text-red-800 border border-red-200';
  };

  const getIcon = () => {
    if (!showIcon) return null;
    if (rank <= 3) return '🏆';
    if (rank <= 10) return '⭐';
    if (rank <= 30) return '✨';
    return null;
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${getColorClass()} ${
      size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'
    }`}>
      {showIcon && getIcon()}
      #{rank}
    </span>
  );
}
