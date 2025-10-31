import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import useAuthStore from '../store/auth'
import useTasksStore from '../store/tasks'
import useClientsStore from '../store/clients'
import UserAvatar from '../components/UserAvatar'

export default function Tasks() {
  const { token, user } = useAuthStore()
  const { tasks, loading, fetchTasks, updateTask } = useTasksStore()
  const { clients, fetchClients } = useClientsStore()
  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupByStaff, setGroupByStaff] = useState(user?.role === 'Boss' || user?.role === 'Manager')
  const [expandedStaff, setExpandedStaff] = useState({})
  const [expandedClients, setExpandedClients] = useState({})
  const [expandedStaffClients, setExpandedStaffClients] = useState({}) // For staff's client groups

  useEffect(() => {
    if (token) {
      fetchTasks(token)
      fetchClients(token)
    }
  }, [token])

  useEffect(() => {
    setGroupByStaff(user?.role === 'Boss' || user?.role === 'Manager')
  }, [user])

  const toggleStaffGroup = (staffName) => {
    setExpandedStaff(prev => ({
      ...prev,
      [staffName]: !prev[staffName]
    }))
  }

  const toggleClientGroup = (staffName, clientName) => {
    const key = `${staffName}-${clientName}`
    setExpandedClients(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const toggleStaffClientGroup = (clientName) => {
    setExpandedStaffClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }))
  }

  const expandAll = () => {
    const allExpanded = {}
    Object.keys(groupedTasks).forEach(staffName => {
      allExpanded[staffName] = true
    })
    setExpandedStaff(allExpanded)
  }

  const collapseAll = () => {
    setExpandedStaff({})
    setExpandedClients({})
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'Review': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'Completed': return 'bg-green-100 text-green-700 border-green-300'
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-300'
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(token, taskId, { status: newStatus })
    } catch (error) {
      alert('Failed to update task status')
    }
  }

  const handleSendReminder = async (task) => {
    if (!task.assignedTo?.email) {
      alert('Cannot send reminder: No assignee email found')
      return
    }
    
    // TODO: Implement reminder email functionality
    alert(`Reminder would be sent to ${task.assignedTo.name} (${task.assignedTo.email}) for task: "${task.title}"`)
  }

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedTo?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesSearch
  })

  // Group tasks by staff member, then by client
  const groupedTasks = {}
  if (groupByStaff) {
    filteredTasks.forEach(task => {
      const staffName = task.assignedTo?.name || 'Unassigned'
      if (!groupedTasks[staffName]) {
        groupedTasks[staffName] = {}
      }
      
      const clientName = task.clientId?.name || 'No Client'
      if (!groupedTasks[staffName][clientName]) {
        groupedTasks[staffName][clientName] = []
      }
      groupedTasks[staffName][clientName].push(task)
    })
  }

  // Group tasks by client for staff view
  const groupedByClient = {}
  if (!groupByStaff) {
    filteredTasks.forEach(task => {
      const clientName = task.clientId?.name || 'No Client'
      if (!groupedByClient[clientName]) {
        groupedByClient[clientName] = []
      }
      groupedByClient[clientName].push(task)
    })
  }

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    review: tasks.filter(t => t.status === 'Review').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-indigo-100 rounded-full p-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.review}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-4 text-gray-500">No tasks found</p>
            </div>
          ) : groupByStaff ? (
            // Grouped by staff view (for Boss and Manager)
            <div className="p-4 space-y-4">
              {/* Expand/Collapse All Buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={expandAll}
                  className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Collapse All
                </button>
              </div>

              {Object.keys(groupedTasks).sort().map((staffName) => {
                const allStaffTasks = Object.values(groupedTasks[staffName]).flat()
                const totalTasks = allStaffTasks.length
                const statusCounts = {
                  pending: allStaffTasks.filter(t => t.status === 'Pending').length,
                  inProgress: allStaffTasks.filter(t => t.status === 'In Progress').length,
                  review: allStaffTasks.filter(t => t.status === 'Review').length,
                  completed: allStaffTasks.filter(t => t.status === 'Completed').length,
                  cancelled: allStaffTasks.filter(t => t.status === 'Cancelled').length,
                }
                return (
                <div key={staffName} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors"
                    onClick={() => toggleStaffGroup(staffName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg 
                          className={`w-5 h-5 text-gray-600 transition-transform ${expandedStaff[staffName] ? 'rotate-90' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold text-sm shadow-md">
                          {staffName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {staffName} 
                            <span className="ml-2 text-sm font-normal text-gray-600">
                              ({totalTasks} task{totalTasks !== 1 ? 's' : ''})
                            </span>
                          </h3>
                          <div className="flex gap-2 mt-1">
                            {statusCounts.pending > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                                {statusCounts.pending} Pending
                              </span>
                            )}
                            {statusCounts.inProgress > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                                {statusCounts.inProgress} In Progress
                              </span>
                            )}
                            {statusCounts.review > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">
                                {statusCounts.review} Review
                              </span>
                            )}
                            {statusCounts.completed > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-300">
                                {statusCounts.completed} Completed
                              </span>
                            )}
                            {statusCounts.cancelled > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 border border-red-300">
                                {statusCounts.cancelled} Cancelled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {expandedStaff[staffName] ? 'Click to collapse' : 'Click to expand'}
                      </span>
                    </div>
                  </div>
                  {expandedStaff[staffName] && (
                    <div className="p-4 space-y-3 bg-gray-50">
                      {Object.keys(groupedTasks[staffName]).sort().map((clientName) => {
                        const clientKey = `${staffName}-${clientName}`
                        const clientTasks = groupedTasks[staffName][clientName]
                        return (
                          <div key={clientKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 cursor-pointer hover:from-blue-100 hover:to-cyan-100 transition-colors flex items-center justify-between"
                              onClick={() => toggleClientGroup(staffName, clientName)}
                            >
                              <div className="flex items-center gap-2">
                                <svg 
                                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedClients[clientKey] ? 'rotate-90' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                                <h4 className="font-semibold text-gray-800">
                                  {clientName}
                                  <span className="ml-2 text-xs font-normal text-gray-600">
                                    ({clientTasks.length} task{clientTasks.length !== 1 ? 's' : ''})
                                  </span>
                                </h4>
                              </div>
                              <span className="text-xs text-gray-500">
                                {expandedClients[clientKey] ? 'Click to collapse' : 'Click to expand'}
                              </span>
                            </div>
                            {expandedClients[clientKey] && (
                              <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientTasks.map((task) => (
                          <tr key={task._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                <span className="text-xs text-gray-500 line-clamp-1">{task.description}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{task.clientId?.name || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-600">{task.type}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {task.assignedTo ? (
                                <UserAvatar user={task.assignedTo} size="sm" showName={true} />
                              ) : (
                                <span className="text-sm text-gray-400">Unassigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task._id, e.target.value)}
                                className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)} cursor-pointer`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Review">Review</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {task.dueDate ? (
                                <span className="text-sm text-gray-600">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">No due date</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedTask(task)
                                    setShowModal(true)
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                  title="View Details"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                {task.assignedTo && task.status !== 'Completed' && task.status !== 'Cancelled' && (
                                  <button
                                    onClick={() => handleSendReminder(task)}
                                    className="text-orange-600 hover:text-orange-900 hover:bg-orange-50 px-2 py-1 rounded transition-colors"
                                    title="Send Reminder"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )})}
            </div>
          ) : (
            // Client-grouped view (for Staff)
            <div className="space-y-4">
              {Object.keys(groupedByClient).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500">No tasks found</p>
                </div>
              ) : (
                Object.entries(groupedByClient).map(([clientName, clientTasks]) => {
                  const isExpanded = expandedStaffClients[clientName]
                  const taskCounts = {
                    pending: clientTasks.filter(t => t.status === 'Pending').length,
                    inProgress: clientTasks.filter(t => t.status === 'In Progress').length,
                    completed: clientTasks.filter(t => t.status === 'Completed').length,
                  }

                  return (
                    <div key={clientName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* Client Header */}
                      <div
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                        onClick={() => toggleStaffClientGroup(clientName)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <svg
                              className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900">{clientName}</h3>
                            <span className="text-sm text-gray-600">({clientTasks.length} {clientTasks.length === 1 ? 'task' : 'tasks'})</span>
                          </div>
                          <div className="flex gap-2">
                            {taskCounts.pending > 0 && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                                {taskCounts.pending} Pending
                              </span>
                            )}
                            {taskCounts.inProgress > 0 && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                                {taskCounts.inProgress} In Progress
                              </span>
                            )}
                            {taskCounts.completed > 0 && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-300">
                                {taskCounts.completed} Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Client Tasks Table */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {clientTasks.map((task) => (
                                <tr key={task._id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                      <span className="text-xs text-gray-500 line-clamp-1">{task.description}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-600">{task.type}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleStatusChange(task._id, e.target.value)}
                                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)} cursor-pointer`}
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Completed">Completed</option>
                                    </select>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {task.dueDate ? (
                                      <span className="text-sm text-gray-600">
                                        {new Date(task.dueDate).toLocaleDateString()}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-400">No due date</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                      onClick={() => {
                                        setSelectedTask(task)
                                        setShowModal(true)
                                      }}
                                      className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-3 py-1 rounded transition-colors"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
            
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-xl flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Task Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{selectedTask.title}</h4>
                  <div className="flex gap-2 mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-700 mb-2">Description</h5>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Client</h5>
                    <p className="text-gray-600">{selectedTask.clientId?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Type</h5>
                    <p className="text-gray-600">{selectedTask.type}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Assigned To</h5>
                    {selectedTask.assignedTo ? (
                      <UserAvatar user={selectedTask.assignedTo} size="md" showName={true} />
                    ) : (
                      <p className="text-gray-600">Unassigned</p>
                    )}
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Created By</h5>
                    {selectedTask.createdBy ? (
                      <UserAvatar user={selectedTask.createdBy} size="md" showName={true} />
                    ) : (
                      <p className="text-gray-600">N/A</p>
                    )}
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Due Date</h5>
                    <p className="text-gray-600">
                      {selectedTask.dueDate 
                        ? new Date(selectedTask.dueDate).toLocaleDateString()
                        : 'No due date'}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Created</h5>
                    <p className="text-gray-600">{new Date(selectedTask.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedTask.relatedUrl && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium text-gray-700 mb-1">Related URL</h5>
                    <a 
                      href={selectedTask.relatedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline break-all"
                    >
                      {selectedTask.relatedUrl}
                    </a>
                  </div>
                )}

                {selectedTask.aiSuggestion && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium text-gray-700 mb-2">AI Suggestion</h5>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700 mb-2">{selectedTask.aiSuggestion.recommendation}</p>
                      {selectedTask.aiSuggestion.reasoning && (
                        <p className="text-xs text-gray-600 italic">{selectedTask.aiSuggestion.reasoning}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedTask.logs && selectedTask.logs.length > 0 && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium text-gray-700 mb-2">Activity Log</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedTask.logs.map((log, idx) => (
                        <div key={idx} className="text-xs text-gray-600 border-l-2 border-gray-300 pl-3">
                          <p className="font-medium">{log.action}</p>
                          <p className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
