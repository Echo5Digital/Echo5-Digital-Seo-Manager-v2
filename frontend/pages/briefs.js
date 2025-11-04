import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import useAuthStore from '../store/auth'
import useBlogStore from '../store/blogs'
import useClientStore from '../store/clients'
import { 
  DocumentTextIcon, 
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserPlusIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

export default function Briefs() {
  const router = useRouter()
  const { token, user } = useAuthStore()
  const { blogs, loading, fetchBlogs, deleteBlog } = useBlogStore()
  const { clients, fetchClients } = useClientStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all') // all, assigned, unassigned
  const [expandedClients, setExpandedClients] = useState({})
  
  // Assignment modals
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showBlogAssignModal, setShowBlogAssignModal] = useState(false)
  const [selectedBrief, setSelectedBrief] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskPriority, setTaskPriority] = useState('Medium')
  const [assigningTask, setAssigningTask] = useState(false)
  const [assigningBlog, setAssigningBlog] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token) {
      fetchBlogs(token)
      fetchClients()
      if (canAssignTasks()) {
        fetchTeamMembers()
      }
    }
  }, [token])

  // Check if user can assign tasks
  const canAssignTasks = () => {
    return user && ['Boss', 'Manager', 'Admin'].includes(user.role)
  }
  
  // Fetch team members for task assignment
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.data.users.filter(u => u.role !== 'Boss'))
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    }
  }

  const filteredBriefs = blogs.filter(blog => {
    const matchesSearch = blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.focusKeyword?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClient = !selectedClient || blog.clientId?._id === selectedClient || blog.clientId === selectedClient
    const matchesStatus = selectedStatus === 'all' || blog.status === selectedStatus
    const matchesAssignment = assignmentFilter === 'all' || 
                             (assignmentFilter === 'assigned' && blog.assignedTo) ||
                             (assignmentFilter === 'unassigned' && !blog.assignedTo)
    
    return matchesSearch && matchesClient && matchesStatus && matchesAssignment
  })

  // Group briefs by client
  const groupedBriefs = filteredBriefs.reduce((acc, brief) => {
    const clientId = typeof brief.clientId === 'object' ? brief.clientId?._id : brief.clientId
    const clientName = typeof brief.clientId === 'object' ? brief.clientId?.name : 'Unknown Client'
    
    if (!acc[clientId]) {
      acc[clientId] = {
        clientName,
        briefs: []
      }
    }
    acc[clientId].briefs.push(brief)
    return acc
  }, {})

  // Sort groups by client name
  const sortedGroups = Object.entries(groupedBriefs).sort((a, b) => 
    a[1].clientName.localeCompare(b[1].clientName)
  )

  const toggleClientExpand = (clientId) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }))
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this brief?')) {
      await deleteBlog(token, id)
      fetchBlogs(token)
    }
  }

  const handleView = (id) => {
    router.push(`/briefs/${id}`)
  }

  // Open task assignment modal
  const handleOpenTaskModal = (brief) => {
    setSelectedBrief(brief)
    setShowTaskModal(true)
  }

  // Open blog assignment modal
  const handleOpenBlogAssignModal = (brief) => {
    setSelectedBrief(brief)
    setShowBlogAssignModal(true)
  }

  // Assign brief as task to staff
  const handleAssignTask = async () => {
    if (!selectedStaff || !selectedBrief) return

    setAssigningTask(true)
    setMessage('')

    try {
      const taskData = {
        clientId: selectedBrief.clientId?._id || selectedBrief.clientId,
        title: `Write Blog: ${selectedBrief.title || selectedBrief.metaTitle}`,
        description: `**Blog Content Task**\n\nComplete the blog post based on the saved brief:\n\n**Title:** ${selectedBrief.title || selectedBrief.metaTitle}\n**Focus Keyword:** ${selectedBrief.focusKeyword}\n**Word Count Target:** ${selectedBrief.wordCount || 1000} words\n\n**Meta Description:**\n${selectedBrief.metaDescription}\n\n**Content Outline:**\n${selectedBrief.headings?.h2?.map((h2, i) => `${i + 1}. ${h2}`).join('\n') || 'See brief for details'}\n\n**FAQs to Include:**\n${selectedBrief.faqs?.map((faq, i) => `${i + 1}. ${faq.question}`).join('\n') || 'None'}\n\n**Semantic Keywords:** ${selectedBrief.semanticKeywords?.join(', ') || 'N/A'}`,
        type: 'Blog Writing',
        assignedTo: selectedStaff,
        priority: taskPriority,
        status: 'Pending',
        dueDate: taskDueDate || undefined,
        relatedUrl: `/briefs/${selectedBrief._id}`
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        setMessage('✅ Task assigned successfully!')
        setShowTaskModal(false)
        setSelectedStaff('')
        setTaskDueDate('')
        setTaskPriority('Medium')
        setSelectedBrief(null)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('❌ Failed to assign task')
      }
    } catch (error) {
      setMessage('❌ Error assigning task: ' + error.message)
    } finally {
      setAssigningTask(false)
    }
  }

  // Assign brief to writer
  const handleAssignBlog = async () => {
    if (!selectedStaff || !selectedBrief) return

    setAssigningBlog(true)
    setMessage('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/blogs/${selectedBrief._id}/assign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignedTo: selectedStaff })
      })

      if (response.ok) {
        setMessage('✅ Blog assigned successfully!')
        setShowBlogAssignModal(false)
        setSelectedStaff('')
        setSelectedBrief(null)
        fetchBlogs(token) // Refresh the list
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        setMessage('❌ Failed to assign blog: ' + error.message)
      }
    } catch (error) {
      setMessage('❌ Error assigning blog: ' + error.message)
    } finally {
      setAssigningBlog(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-2">
              <DocumentTextIcon className="w-8 h-8 text-white" />
            </div>
            Blog Briefs
          </h1>
          <p className="text-gray-600 mt-1">Manage all your saved blog content briefs</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Client Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Assignment Filter */}
            {canAssignTasks() && (
              <div className="relative">
                <UserPlusIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Assignments</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-700">{blogs.length}</div>
            <div className="text-sm text-blue-600">Total Briefs</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-700">
              {blogs.filter(b => b.status === 'draft').length}
            </div>
            <div className="text-sm text-purple-600">Drafts</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-700">
              {blogs.filter(b => b.status === 'review').length}
            </div>
            <div className="text-sm text-yellow-600">In Review</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-700">
              {blogs.filter(b => b.status === 'published').length}
            </div>
            <div className="text-sm text-green-600">Published</div>
          </div>
          {canAssignTasks() && (
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-teal-700">
                {blogs.filter(b => b.assignedTo).length}
              </div>
              <div className="text-sm text-teal-600">Assigned</div>
            </div>
          )}
        </div>

        {/* Briefs List */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading briefs...</p>
          </div>
        ) : filteredBriefs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No briefs found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedClient || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first blog brief to get started'}
            </p>
            <button
              onClick={() => router.push('/blog-creator')}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
            >
              Create Blog Brief
            </button>
          </div>
        ) : (
          <>
            {/* Success/Error Message */}
            {message && (
              <div className={`p-4 rounded-lg border ${
                message.includes('✅') 
                  ? 'bg-green-50 text-green-800 border-green-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {message}
              </div>
            )}
            
            <div className="space-y-6">
            {sortedGroups.map(([clientId, group]) => (
              <div key={clientId} className="space-y-4">
                {/* Client Header - Clickable */}
                <div 
                  onClick={() => toggleClientExpand(clientId)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-4 shadow-md cursor-pointer hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg 
                        className={`w-6 h-6 transition-transform ${expandedClients[clientId] !== false ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div>
                        <h2 className="text-2xl font-bold">{group.clientName}</h2>
                        <p className="text-purple-100 text-sm mt-1">
                          {group.briefs.length} {group.briefs.length === 1 ? 'brief' : 'briefs'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-full px-4 py-2">
                      <span className="text-2xl font-bold">{group.briefs.length}</span>
                    </div>
                  </div>
                </div>

                {/* Briefs in this group - Collapsible */}
                {expandedClients[clientId] !== false && (
                  <div className="grid grid-cols-1 gap-4">
                    {group.briefs.map(brief => (
                    <div
                      key={brief._id}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-2">
                              <DocumentTextIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {brief.title || brief.metaTitle}
                              </h3>
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {brief.metaDescription}
                              </p>
                              
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  {formatDate(brief.createdAt)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold">Keyword:</span>
                                  {brief.focusKeyword}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold">Words:</span>
                                  {brief.wordCount || 'N/A'}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(brief.status)}`}>
                                  {brief.status || 'draft'}
                                </span>
                                {brief.assignedTo && (
                                  <span className="px-3 py-1 text-xs bg-green-100 text-green-800 border border-green-200 rounded-full flex items-center gap-1">
                                    <UserPlusIcon className="w-3 h-3" />
                                    Assigned to: {typeof brief.assignedTo === 'object' ? brief.assignedTo.name : 'Writer'}
                                  </span>
                                )}
                                {!brief.assignedTo && canAssignTasks() && (
                                  <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full">
                                    Unassigned
                                  </span>
                                )}
                                {brief.faqs && brief.faqs.length > 0 && (
                                  <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                    {brief.faqs.length} FAQs
                                  </span>
                                )}
                                {brief.semanticKeywords && brief.semanticKeywords.length > 0 && (
                                  <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                    {brief.semanticKeywords.length} Keywords
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {canAssignTasks() && (
                            <>
                              <button
                                onClick={() => handleOpenBlogAssignModal(brief)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Assign to Writer"
                              >
                                <UserPlusIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleOpenTaskModal(brief)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Assign as Task"
                              >
                                <ClipboardDocumentListIcon className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleView(brief._id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(brief._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Task Assignment Modal */}
      {showTaskModal && selectedBrief && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Blog Writing Task</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a task for: <strong>{selectedBrief.title || selectedBrief.metaTitle}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Staff Member *
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select staff member...</option>
                  {teamMembers.map(member => (
                    <option key={member._id} value={member._id}>
                      {member.name} - {member.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTaskModal(false)
                  setSelectedStaff('')
                  setTaskDueDate('')
                  setTaskPriority('Medium')
                  setSelectedBrief(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTask}
                disabled={!selectedStaff || assigningTask}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50"
              >
                {assigningTask ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blog Assignment Modal */}
      {showBlogAssignModal && selectedBrief && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Blog to Writer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Assign brief to a team member: <strong>{selectedBrief.title || selectedBrief.metaTitle}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Writer *
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select team member...</option>
                  {teamMembers.map(member => (
                    <option key={member._id} value={member._id}>
                      {member.name} - {member.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBlogAssignModal(false)
                  setSelectedStaff('')
                  setSelectedBrief(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignBlog}
                disabled={!selectedStaff || assigningBlog}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50"
              >
                {assigningBlog ? 'Assigning...' : 'Assign Blog'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
