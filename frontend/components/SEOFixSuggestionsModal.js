import { useState, useEffect } from 'react'

export default function SEOFixSuggestionsModal({ isOpen, suggestions = [], onClose, onAssign }) {
  const [localSuggestions, setLocalSuggestions] = useState([])
  const [allExpanded, setAllExpanded] = useState(false)

  useEffect(() => {
    if (suggestions.length > 0) {
      setLocalSuggestions(suggestions.map(s => ({
        ...s,
        selected: false,
        expanded: false,
        notes: ''
      })))
    }
  }, [suggestions])

  if (!isOpen) return null

  const highPriorityCount = localSuggestions.filter(s => s.priority >= 8).length
  const mediumPriorityCount = localSuggestions.filter(s => s.priority >= 5 && s.priority < 8).length
  const lowPriorityCount = localSuggestions.filter(s => s.priority < 5).length
  const selectedCount = localSuggestions.filter(s => s.selected).length
  const allSelected = localSuggestions.length > 0 && localSuggestions.every(s => s.selected)

  const toggleSelectAll = () => {
    setLocalSuggestions(prev => prev.map(s => ({ ...s, selected: !allSelected })))
  }

  const toggleExpand = (index) => {
    setLocalSuggestions(prev => prev.map((s, i) => 
      i === index ? { ...s, expanded: !s.expanded } : s
    ))
  }

  const expandAll = () => {
    const newExpanded = !allExpanded
    setAllExpanded(newExpanded)
    setLocalSuggestions(prev => prev.map(s => ({ ...s, expanded: newExpanded })))
  }

  const updateSuggestion = (index, field, value) => {
    setLocalSuggestions(prev => prev.map((s, i) => 
      i === index ? { ...s, [field]: value } : s
    ))
  }

  const getBorderColor = (priority) => {
    if (priority >= 8) return 'border-red-300 bg-red-50'
    if (priority >= 5) return 'border-yellow-300 bg-yellow-50'
    return 'border-blue-300 bg-blue-50'
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Title': 'bg-purple-100 text-purple-700',
      'Meta': 'bg-blue-100 text-blue-700',
      'Content': 'bg-green-100 text-green-700',
      'Images': 'bg-pink-100 text-pink-700',
      'Links': 'bg-indigo-100 text-indigo-700',
      'Technical': 'bg-gray-100 text-gray-700',
      'Keywords': 'bg-orange-100 text-orange-700',
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  const getImpactColor = (impact) => {
    if (impact === 'High') return 'bg-red-100 text-red-700'
    if (impact === 'Medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-blue-100 text-blue-700'
  }

  const handleAssign = () => {
    const selected = localSuggestions.filter(s => s.selected)
    onAssign(selected)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
                <div>
                  <h2 className="text-2xl font-bold">AI-Powered SEO Fix Suggestions</h2>
                  <p className="text-purple-100 text-sm mt-1">{localSuggestions.length} recommendations generated</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 text-sm font-medium">High Priority</div>
                <div className="text-2xl font-bold text-red-700">{highPriorityCount}</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-600 text-sm font-medium">Medium Priority</div>
                <div className="text-2xl font-bold text-yellow-700">{mediumPriorityCount}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-600 text-sm font-medium">Low Priority</div>
                <div className="text-2xl font-bold text-blue-700">{lowPriorityCount}</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 text-sm font-medium">Selected</div>
                <div className="text-2xl font-bold text-green-700">{selectedCount}</div>
              </div>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={toggleSelectAll} 
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="font-medium text-gray-700">Select All Suggestions</span>
              </label>
              <button onClick={expandAll} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {/* Suggestions List */}
            <div className="space-y-4">
              {localSuggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg overflow-hidden transition-all hover:shadow-md ${getBorderColor(suggestion.priority)}`}
                >
                  <div className="bg-gray-50 p-4 flex items-start space-x-3">
                    <input 
                      type="checkbox" 
                      checked={suggestion.selected}
                      onChange={(e) => updateSuggestion(index, 'selected', e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(suggestion.category)}`}>
                            {suggestion.category}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getImpactColor(suggestion.impact)}`}>
                            {suggestion.impact} Impact
                          </span>
                          <span className="text-gray-500 text-xs">
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            {suggestion.estimatedTime}
                          </span>
                        </div>
                        <button onClick={() => toggleExpand(index)} className="text-gray-500 hover:text-gray-700">
                          <svg className={`w-5 h-5 transition-transform ${suggestion.expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                      </div>

                      <h3 className="font-semibold text-gray-800 mb-1">{suggestion.issue}</h3>
                      <p className="text-gray-600 text-sm">{suggestion.reasoning}</p>

                      {/* Expanded Details */}
                      {suggestion.expanded && (
                        <div className="mt-4 space-y-4">
                          {/* Current Value */}
                          {suggestion.currentValue && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-gray-700">{suggestion.currentValue}</p>
                              </div>
                            </div>
                          )}

                          {/* Suggested Value (Editable) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Fix</label>
                            <textarea 
                              value={suggestion.suggestedValue}
                              onChange={(e) => updateSuggestion(index, 'suggestedValue', e.target.value)}
                              rows="3"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Edit the suggested fix..."
                            />
                            <p className="text-xs text-gray-500 mt-1">You can manually edit this suggestion before assigning</p>
                          </div>

                          {/* Additional Notes */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (Optional)</label>
                            <textarea 
                              value={suggestion.notes}
                              onChange={(e) => updateSuggestion(index, 'notes', e.target.value)}
                              rows="2"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Add any additional context or instructions..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{selectedCount}</span> of {localSuggestions.length} fixes selected
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssign}
                disabled={selectedCount === 0}
                className={`px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>Assign to Team Member</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
