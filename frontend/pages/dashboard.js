import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import useAuthStore from '../store/auth'
import useClientStore from '../store/clients'
import UserAvatar from '../components/UserAvatar'
import { 
  UserGroupIcon, 
  DocumentCheckIcon, 
  ChartBarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const user = useAuthStore(state => state.user)
  const clients = useClientStore(state => state.clients)
  const fetchClients = useClientStore(state => state.fetchClients)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchClients()
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fetchClients])

  const stats = [
    { name: 'Total Clients', value: clients.length, icon: UserGroupIcon, color: 'bg-blue-500' },
    { name: 'Active Audits', value: '0', icon: DocumentCheckIcon, color: 'bg-green-500' },
    { name: 'Tasks Pending', value: '0', icon: ClockIcon, color: 'bg-yellow-500' },
    { name: 'Reports Generated', value: '0', icon: ChartBarIcon, color: 'bg-purple-500' },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="xl" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here is your SEO operations overview
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                      </div>
                      <div className={`${stat.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="text-sm text-gray-500 text-center py-8">
                  No recent activity
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <a href="/clients" className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <p className="font-medium text-blue-900">Manage Clients</p>
                    <p className="text-sm text-blue-700">View and manage your client list</p>
                  </a>
                  <a href="/audits" className="block p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <p className="font-medium text-green-900">Run SEO Audit</p>
                    <p className="text-sm text-green-700">Analyze website SEO performance</p>
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
