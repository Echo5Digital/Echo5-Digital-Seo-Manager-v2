import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import useAuthStore from '../store/auth'
import {
  HomeIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  UsersIcon,
  LightBulbIcon,
  ChartBarSquareIcon,
  RectangleStackIcon,
  ChartPieIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function Sidebar() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, isNew: true },
    { name: 'Intelligence', href: '/dashboard/executive', icon: SparklesIcon, isNew: true, isAI: true },
    { name: 'Clients', href: '/clients', icon: UserGroupIcon, isNew: true },
    { name: 'SEO Audits', href: '/audits', icon: DocumentCheckIcon, isNew: true },
    { name: 'Keywords', href: '/keywords', icon: MagnifyingGlassIcon },
    { name: 'Keyword Planner', href: '/keyword-planner', icon: LightBulbIcon, isNew: true },
    { name: 'Rank Checker', href: '/rank-checker', icon: ChartBarSquareIcon, isNew: true },
    { name: 'Backlinks', href: '/backlinks', icon: LinkIcon },
    { name: 'Page Optimizer', href: '/pages', icon: DocumentTextIcon, isNew: true },
    { name: 'Blog Creator', href: '/blog-creator', icon: DocumentTextIcon, isNew: true },
    { name: 'Briefs', href: '/briefs', icon: RectangleStackIcon, isNew: true },
    { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon, isNew: true },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: ChartPieIcon, 
      hasSubmenu: true,
      submenu: [
        { name: 'Google Analytics', href: '/analytics/google-analytics' },
        { name: 'Google Search Console', href: '/analytics/google-search-console' },
        { name: 'Google Business Profile', href: '/analytics/google-business-profile' }
      ]
    },
  ]

  if (user?.role === 'Boss') {
    navigation.push(
      { name: 'Team', href: '/team', icon: UsersIcon, isNew: true },
      { name: 'Settings', href: '/settings', icon: Cog6ToothIcon }
    )
  }

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 gap-3">
          <img src="/echo5-logo.png" alt="Echo5" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-black">SEO OPS</h1>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/')
            
            // Handle Analytics with submenu
            if (item.hasSubmenu) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                    onMouseEnter={() => setAnalyticsExpanded(true)}
                    className={`${
                      isActive
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors w-full`}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={`${
                          isActive ? 'text-orange-600' : 'text-black-700 group-hover:text-gray-500'
                        } mr-3 h-5 w-5 flex-shrink-0`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isNew && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-white bg-orange-500 rounded-full">
                          NEW
                        </span>
                      )}
                      {analyticsExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  
                  {analyticsExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.submenu.map((subItem) => {
                        const isSubActive = router.pathname === subItem.href
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={`${
                              isSubActive
                                ? 'bg-orange-50 text-orange-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            } block px-3 py-2 text-sm rounded-lg transition-colors`}
                          >
                            {subItem.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }
            
            // Regular navigation items
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-orange-100 text-orange-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors`}
              >
                <div className="flex items-center">
                  <Icon
                    className={`${
                      isActive ? 'text-orange-600' : 'text-black-700 group-hover:text-gray-500'
                    } mr-3 h-5 w-5 flex-shrink-0`}
                    aria-hidden="true"
                  />
                  {item.name}
                </div>
                {item.isAI ? (
                  <span className="px-2 py-0.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full">
                    AI
                  </span>
                ) : item.isNew && (
                  <span className="px-2 py-0.5 text-xs font-semibold text-white bg-orange-500 rounded-full">
                    NEW
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
