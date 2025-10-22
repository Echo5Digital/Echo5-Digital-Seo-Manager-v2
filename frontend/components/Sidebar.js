import Link from 'next/link'
import { useRouter } from 'next/router'
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
  UsersIcon
} from '@heroicons/react/24/outline'

export default function Sidebar() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Clients', href: '/clients', icon: UserGroupIcon },
    { name: 'SEO Audits', href: '/audits', icon: DocumentCheckIcon },
    { name: 'Keywords', href: '/keywords', icon: MagnifyingGlassIcon },
    { name: 'Backlinks', href: '/backlinks', icon: LinkIcon },
    { name: 'Pages', href: '/pages', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  ]

  if (user?.role === 'Boss') {
    navigation.push(
      { name: 'Team', href: '/team', icon: UsersIcon },
      { name: 'Settings', href: '/settings', icon: Cog6ToothIcon }
    )
  }

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-2xl font-bold text-blue-600">Echo5 SEO</h1>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors`}
              >
                <Icon
                  className={`${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 h-5 w-5 flex-shrink-0`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
