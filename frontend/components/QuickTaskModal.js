import { useState, useEffect } from 'react'
import useAuthStore from '../store/auth'
import useTasksStore from '../store/tasks'
import {
  XMarkIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  FlagIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

/**
 * QuickTaskModal - One-click task creation from SEO issues
 * Auto-populates task data from issue details and optionally generates AI suggestions
 */
export default function QuickTaskModal({ 
  isOpen, 
  onClose, 
  issue = null,  // { category, message, severity, pageUrl, pageTitle, clientId }
  page = null    // Full page object for additional context
}) {
  const { token, user } = useAuthStore()
  const { createTask } = useTasksStore()
  
  const [loading, setLoading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  
  // Task form state
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    type: 'Other',
    priority: 'Medium',
    assignedTo: '',
    dueDate: '',
    timeEstimate: '',
    relatedUrl: ''
  })
  
  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState(null)

  // Map issue categories to task types
  const categoryToTaskType = {
    'Title': 'Meta Update',
    'Meta': 'Meta Update',
    'Meta Description': 'Meta Update',
    'H1': 'Content Optimization',
    'Content': 'Content Optimization',
    'Images': 'Alt Text',
    'Alt Tags': 'Alt Text',
    'Links': 'Internal Linking',
    'Internal Links': 'Internal Linking',
    'Technical': 'Technical SEO',
    'Schema': 'Schema Markup',
    'Page Speed': 'Page Speed',
    'Keywords': 'Keyword Research',
    'Canonical': 'Technical SEO',
    'Robots': 'Technical SEO'
  }

  // Map severity to priority
  const severityToPriority = {
    'critical': 'Critical',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low'
  }

  // Fetch team members
  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers()
    }
  }, [isOpen])

  // Auto-populate task data when issue changes
  useEffect(() => {
    if (issue && isOpen) {
      const taskType = categoryToTaskType[issue.category] || 'Other'
      const priority = severityToPriority[issue.severity?.toLowerCase()] || 'Medium'
      
      setTaskData({
        title: `${issue.category}: ${issue.message?.substring(0, 50)}${issue.message?.length > 50 ? '...' : ''}`,
        description: generateDescription(issue, page),
        type: taskType,
        priority: priority,
        assignedTo: '',
        dueDate: '',
        timeEstimate: estimateTime(issue.category, issue.severity),
        relatedUrl: page?.url || issue.pageUrl || ''
      })
      
      // Reset AI suggestion
      setAiSuggestion(null)
    }
  }, [issue, page, isOpen])

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filter to only show staff who can be assigned tasks
        setTeamMembers(data.data.users.filter(u => u.role !== 'Boss' || u._id === user?._id))
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    }
  }

  // Generate task description from issue
  const generateDescription = (issue, page) => {
    let desc = `**Issue Category:** ${issue.category}\n`
    desc += `**Issue:** ${issue.message}\n`
    desc += `**Severity:** ${issue.severity || 'Medium'}\n\n`
    
    if (page) {
      desc += `**Page Details:**\n`
      desc += `- URL: ${page.url}\n`
      desc += `- Title: ${page.title || 'Not set'}\n`
      if (page.h1) desc += `- H1: ${page.h1}\n`
      if (page.seo?.focusKeyword) desc += `- Focus Keyword: ${page.seo.focusKeyword}\n`
      desc += '\n'
    }
    
    desc += `**Fix Required:** Please review and fix this SEO issue to improve page optimization.\n`
    
    return desc
  }

  // Estimate time based on issue type
  const estimateTime = (category, severity) => {
    const timeMap = {
      'Title': '15 minutes',
      'Meta': '15 minutes',
      'Meta Description': '15 minutes',
      'H1': '10 minutes',
      'Content': '1 hour',
      'Images': '30 minutes',
      'Alt Tags': '20 minutes',
      'Links': '30 minutes',
      'Internal Links': '30 minutes',
      'Technical': '1 hour',
      'Schema': '1 hour',
      'Page Speed': '2 hours',
      'Keywords': '1 hour'
    }
    return timeMap[category] || '30 minutes'
  }

  // Generate AI suggestion for the fix
  const generateAISuggestion = async () => {
    if (!issue) return
    
    setGeneratingAI(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/tasks/suggest-fix`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issueType: issue.category,
          issueDetails: {
            message: issue.message,
            severity: issue.severity,
            pageUrl: page?.url || issue.pageUrl,
            pageTitle: page?.title || issue.pageTitle,
            currentTitle: page?.title,
            currentMeta: page?.metaDescription,
            currentH1: page?.h1,
            focusKeyword: page?.seo?.focusKeyword,
            wordCount: page?.content?.wordCount
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setAiSuggestion(data.data.suggestion)
        
        // Update description with AI suggestion
        if (data.data.suggestion?.recommendation) {
          setTaskData(prev => ({
            ...prev,
            description: prev.description + `\n\n**AI Suggested Fix:**\n${data.data.suggestion.recommendation}`,
            aiSuggestion: data.data.suggestion
          }))
        }
      } else {
        const errData = await response.json()
        throw new Error(errData.message || 'Failed to generate suggestion')
      }
    } catch (error) {
      console.error('Failed to generate AI suggestion:', error)
      alert('Could not generate AI suggestion. You can still create the task manually.')
    } finally {
      setGeneratingAI(false)
    }
  }

  // Create the task
  const handleCreateTask = async () => {
    if (!taskData.title.trim()) {
      alert('Please provide a task title')
      return
    }
    
    setLoading(true)
    try {
      const taskPayload = {
        clientId: page?.clientId?._id || page?.clientId || issue?.clientId,
        title: taskData.title,
        description: taskData.description,
        type: taskData.type,
        priority: taskData.priority,
        status: 'Pending',
        relatedUrl: taskData.relatedUrl,
        timeEstimate: taskData.timeEstimate
      }
      
      // Add optional fields
      if (taskData.assignedTo) {
        taskPayload.assignedTo = taskData.assignedTo
      }
      if (taskData.dueDate) {
        taskPayload.dueDate = taskData.dueDate
      }
      if (aiSuggestion) {
        taskPayload.aiSuggestion = aiSuggestion
      }
      
      await createTask(token, taskPayload)
      alert('Task created successfully!')
      onClose()
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Quick Create Task</h2>
                  <p className="text-indigo-100 text-sm">From SEO issue: {issue?.category}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Issue Preview */}
            <div className={`mb-6 p-4 rounded-xl border-l-4 ${
              issue?.severity === 'critical' ? 'bg-red-50 border-red-500' :
              issue?.severity === 'high' ? 'bg-orange-50 border-orange-500' :
              issue?.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
              'bg-blue-50 border-blue-500'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    issue?.severity === 'critical' ? 'bg-red-200 text-red-800' :
                    issue?.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                    issue?.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>{issue?.severity?.toUpperCase() || 'MEDIUM'}</span>
                  <span className="ml-2 text-xs font-medium text-gray-600">{issue?.category}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-700">{issue?.message}</p>
            </div>

            {/* AI Suggestion Button */}
            <div className="mb-6">
              <button
                onClick={generateAISuggestion}
                disabled={generatingAI || aiSuggestion}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  aiSuggestion 
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <SparklesIcon className={`w-5 h-5 ${generatingAI ? 'animate-spin' : ''}`} />
                {generatingAI ? 'Generating AI Suggestion...' : 
                 aiSuggestion ? '✓ AI Suggestion Added' : 'Generate AI Fix Suggestion'}
              </button>
              
              {aiSuggestion && (
                <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-800">AI Recommendation</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                      aiSuggestion.estimatedImpact === 'High' ? 'bg-green-100 text-green-700' :
                      aiSuggestion.estimatedImpact === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {aiSuggestion.estimatedImpact} Impact
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSuggestion.recommendation}</p>
                </div>
              )}
            </div>

            {/* Task Form */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskData.title}
                  onChange={e => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter task title..."
                />
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Type
                  </label>
                  <select
                    value={taskData.type}
                    onChange={e => setTaskData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Site Audit Fix">Site Audit Fix</option>
                    <option value="Content Optimization">Content Optimization</option>
                    <option value="Content Writing">Content Writing</option>
                    <option value="Meta Update">Meta Update</option>
                    <option value="Alt Text">Alt Text</option>
                    <option value="Page Speed">Page Speed</option>
                    <option value="Technical SEO">Technical SEO</option>
                    <option value="Schema Markup">Schema Markup</option>
                    <option value="Internal Linking">Internal Linking</option>
                    <option value="Keyword Research">Keyword Research</option>
                    <option value="Backlink Building">Backlink Building</option>
                    <option value="Client Communication">Client Communication</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FlagIcon className="w-4 h-4 inline mr-1" />
                    Priority
                  </label>
                  <select
                    value={taskData.priority}
                    onChange={e => setTaskData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Critical">🔴 Critical</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>
              </div>

              {/* Assign To & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <UserIcon className="w-4 h-4 inline mr-1" />
                    Assign To
                  </label>
                  <select
                    value={taskData.assignedTo}
                    onChange={e => setTaskData(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={taskData.dueDate}
                    onChange={e => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Time Estimate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ⏱ Estimated Time
                </label>
                <input
                  type="text"
                  value={taskData.timeEstimate}
                  onChange={e => setTaskData(prev => ({ ...prev, timeEstimate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 30 minutes, 1 hour"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={taskData.description}
                  onChange={e => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Task description..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTask}
              disabled={loading || !taskData.title.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  Create Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
