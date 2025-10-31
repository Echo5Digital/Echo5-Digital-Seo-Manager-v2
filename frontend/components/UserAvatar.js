import { UserCircleIcon } from '@heroicons/react/24/outline'

/**
 * UserAvatar Component
 * Displays user profile picture with fallback to icon
 * 
 * @param {Object} user - User object with name and picture
 * @param {string} size - Size variant: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} showName - Whether to show user name next to avatar
 * @param {string} className - Additional CSS classes
 */
export default function UserAvatar({ user, size = 'md', showName = false, className = '' }) {
  if (!user) {
    return null
  }

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  const iconSizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }

  const avatarSize = sizeClasses[size] || sizeClasses.md
  const iconSize = iconSizeClasses[size] || iconSizeClasses.md
  const textSize = textSizeClasses[size] || textSizeClasses.md

  const renderAvatar = () => {
    if (user.picture) {
      return (
        <img
          src={user.picture}
          alt={user.name || 'User'}
          className={`${avatarSize} rounded-full border-2 border-gray-300 object-cover`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.target.style.display = 'none'
            if (e.target.nextSibling) {
              e.target.nextSibling.style.display = 'flex'
            }
          }}
        />
      )
    }
    return null
  }

  const renderFallback = () => (
    <div 
      className={`${user.picture ? 'hidden' : 'flex'} items-center justify-center ${avatarSize} rounded-full bg-gradient-to-br from-blue-400 to-purple-500`}
      style={{ display: user.picture ? 'none' : 'flex' }}
    >
      {user.name ? (
        <span className="text-white font-semibold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <UserCircleIcon className={`${iconSize} text-white`} />
      )}
    </div>
  )

  if (showName) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative flex-shrink-0">
          {renderAvatar()}
          {renderFallback()}
        </div>
        <span className={`${textSize} font-medium text-gray-900`}>
          {user.name || 'Unknown User'}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`} title={user.name || 'Unknown User'}>
      {renderAvatar()}
      {renderFallback()}
    </div>
  )
}
