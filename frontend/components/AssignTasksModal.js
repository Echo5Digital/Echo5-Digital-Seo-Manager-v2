import { useState, useEffect } from 'react'
import useAuthStore from '../store/auth'

export default function AssignTasksModal({ isOpen, selectedFixes = [], pageId, pageTitle, onClose, onCreated }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [taskPriority, setTaskPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [taskType, setTaskType] = useState('individual')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { token } = useAuthStore()

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers()
    }
  }, [isOpen])

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

  const createTasks = async () => {
    if (!selectedUserId) return
    
    setIsCreating(true)
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE
      
      if (taskType === 'individual') {
        // Create individual tasks for each fix
        const taskPromises = selectedFixes.map(fix => {
          const taskData = {
            title: `SEO Fix: ${fix.issue}`,
            description: `**Category:** ${fix.category}\n**Issue:** ${fix.issue}\n\n**Current Value:**\n${fix.currentValue || 'N/A'}\n\n**Suggested Fix:**\n${fix.suggestedValue}\n\n**Reasoning:**\n${fix.reasoning}\n\n**Additional Notes:**\n${fix.notes || 'None'}\n\n${additionalNotes ? `**General Instructions:**\n${additionalNotes}` : ''}`,
            assignedTo: selectedUserId,
            priority: taskPriority,
            status: 'To Do',
            relatedPage: pageId,
            dueDate: dueDate || undefined,
            tags: [fix.category, 'SEO', 'AI-Generated']
          }
          
          return fetch(`${baseUrl}/api/tasks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
          })
        })
        
        await Promise.all(taskPromises)
      } else {
        // Create one combined task
        const fixesList = selectedFixes.map((fix, i) => 
          `${i + 1}. **${fix.category} - ${fix.issue}**\n   - Current: ${fix.currentValue || 'N/A'}\n   - Fix: ${fix.suggestedValue}\n   - Notes: ${fix.notes || 'None'}\n`
        ).join('\n')
        
        const taskData = {
          title: `SEO Improvements for: ${pageTitle}`,
          description: `Complete the following ${selectedFixes.length} SEO fixes:\n\n${fixesList}\n${additionalNotes ? `\n**General Instructions:**\n${additionalNotes}` : ''}`,
          assignedTo: selectedUserId,
          priority: taskPriority,
          status: 'To Do',
          relatedPage: pageId,
          dueDate: dueDate || undefined,
          tags: ['SEO', 'AI-Generated', 'Multi-Fix']
        }
        
        await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskData)
        })
      }
      
      onCreated({
        count: taskType === 'individual' ? selectedFixes.length : 1,
        assignee: teamMembers.find(u => u._id === selectedUserId)?.name
      })
      
      handleClose()
    } catch (error) {
      console.error('Failed to create tasks:', error)
      alert('Failed to create tasks. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setSelectedUserId('')
    setTaskPriority('Medium')
    setDueDate('')
    setTaskType('individual')
    setAdditionalNotes('')
    onClose()
  }

  if (!isOpen) return null

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={handleClose}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                <div>
                  <h2 className="text-2xl font-bold">Assign Tasks to Team</h2>
                  <p className="text-blue-100 text-sm mt-1">{selectedFixes.length} SEO fixes to assign</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Select Team Member */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Team Member *
              </label>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">-- Select a team member --</option>
                {teamMembers.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Task Priority */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Priority
              </label>
              <select 
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (Optional)
              </label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={minDate}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Task Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create Tasks As
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    value="individual"
                    checked={taskType === 'individual'}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-gray-700">Individual Tasks ({selectedFixes.length} separate tasks)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    value="combined"
                    checked={taskType === 'combined'}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-gray-700">Combined Task (1 task with all fixes)</span>
                </label>
              </div>
            </div>

            {/* Selected Fixes Preview */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Fixes ({selectedFixes.length})
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                {selectedFixes.map((fix, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{fix.category}:</span>
                      <span className="text-gray-600"> {fix.issue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Instructions (Optional)
              </label>
              <textarea 
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Add any general instructions for the assigned team member..."
              />
            </div>

            {/* Loading State */}
            {isCreating && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-gray-600 mt-2">Creating tasks...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {taskType === 'individual' ? `${selectedFixes.length} tasks` : '1 task'} will be created
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleClose}
                disabled={isCreating}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={createTasks}
                disabled={!selectedUserId || isCreating}
                className={`px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  !selectedUserId || isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-blue-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{isCreating ? 'Creating...' : 'Create Tasks'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
