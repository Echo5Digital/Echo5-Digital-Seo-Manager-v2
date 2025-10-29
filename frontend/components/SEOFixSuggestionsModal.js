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

  // Export suggestions as PDF
  const exportToPDF = () => {
    const highPriorityFixes = localSuggestions.filter(s => s.priority >= 8)
    const mediumPriorityFixes = localSuggestions.filter(s => s.priority >= 5 && s.priority < 8)
    const lowPriorityFixes = localSuggestions.filter(s => s.priority < 5)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Echo5 Digital AI-Powered SEO Fix Suggestions</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
          h1 { color: #5b21b6; border-bottom: 3px solid #5b21b6; padding-bottom: 10px; }
          h2 { color: #4c1d95; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 30px 0; }
          .stat-card { padding: 15px; border-radius: 8px; text-align: center; }
          .stat-card.high { background: #fef2f2; border: 2px solid #fca5a5; }
          .stat-card.medium { background: #fefce8; border: 2px solid #fde047; }
          .stat-card.low { background: #eff6ff; border: 2px solid #93c5fd; }
          .stat-card.selected { background: #f0fdf4; border: 2px solid #86efac; }
          .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
          .stat-value { font-size: 32px; font-weight: bold; }
          .stat-card.high .stat-value { color: #dc2626; }
          .stat-card.medium .stat-value { color: #ca8a04; }
          .stat-card.low .stat-value { color: #2563eb; }
          .stat-card.selected .stat-value { color: #16a34a; }
          .fix { padding: 20px; margin: 15px 0; border-left: 5px solid #6366f1; background: #f9fafb; page-break-inside: avoid; }
          .fix.high { border-color: #dc2626; background: #fef2f2; }
          .fix.medium { border-color: #ca8a04; background: #fefce8; }
          .fix.low { border-color: #2563eb; background: #eff6ff; }
          .fix-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; }
          .badge.category { background: #ddd6fe; color: #5b21b6; }
          .badge.impact { background: #fce7f3; color: #be123c; }
          .badge.priority { background: #fee2e2; color: #991b1b; }
          .badge.time { background: #e0f2fe; color: #075985; }
          .fix-title { font-size: 16px; font-weight: bold; color: #1f2937; margin: 10px 0; }
          .fix-section { margin: 12px 0; }
          .fix-label { font-weight: bold; color: #4b5563; font-size: 13px; margin-bottom: 4px; }
          .fix-value { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
          .fix-value.current { border-left: 4px solid #ef4444; }
          .fix-value.suggested { border-left: 4px solid #10b981; }
          .reasoning { font-style: italic; color: #6b7280; padding: 10px; background: #f3f4f6; border-radius: 6px; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
          @media print {
            .fix { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div style="align-items: center; justify-content: center; display: flex;">
        <img src="/echo5-logo.png" alt="Echo5 Logo" height="80" />
        </div>
        <h1><span style="align-items: center; justify-content: center; display: flex;">Echo5 Digital AI-Powered SEO Fix Suggestions</span></h1>
        
        <div class="stats">
          <div class="stat-card high">
            <div class="stat-label">High Priority</div>
            <div class="stat-value">${highPriorityFixes.length}</div>
          </div>
          <div class="stat-card medium">
            <div class="stat-label">Medium Priority</div>
            <div class="stat-value">${mediumPriorityFixes.length}</div>
          </div>
          <div class="stat-card low">
            <div class="stat-label">Low Priority</div>
            <div class="stat-value">${lowPriorityFixes.length}</div>
          </div>
          <div class="stat-card selected">
            <div class="stat-label">Total Suggestions</div>
            <div class="stat-value">${localSuggestions.length}</div>
          </div>
        </div>

        ${highPriorityFixes.length > 0 ? `
        <h2>🔴 High Priority Fixes (${highPriorityFixes.length})</h2>
        ${highPriorityFixes.map((fix, idx) => `
          <div class="fix high">
            <div class="fix-header">
              <span class="badge category">${fix.category}</span>
              <span class="badge impact">Impact: ${fix.impact}</span>
              <span class="badge priority">Priority: ${fix.priority}/10</span>
              <span class="badge time">⏱ ${fix.estimatedTime}</span>
            </div>
            <div class="fix-title">${idx + 1}. ${fix.issue}</div>
            
            <div class="fix-section">
              <div class="fix-label">Current Value:</div>
              <div class="fix-value current">${fix.currentValue || 'Not set'}</div>
            </div>
            
            <div class="fix-section">
              <div class="fix-label">✅ Suggested Fix (Ready to Use):</div>
              <div class="fix-value suggested">${fix.suggestedValue}</div>
            </div>
            
            <div class="fix-section">
              <div class="fix-label">Why This Matters:</div>
              <div class="reasoning">${fix.reasoning}</div>
            </div>
          </div>
        `).join('')}
        ` : ''}

        ${mediumPriorityFixes.length > 0 ? `
        <h2>🟡 Medium Priority Fixes (${mediumPriorityFixes.length})</h2>
        ${mediumPriorityFixes.map((fix, idx) => `
          <div class="fix medium">
            <div class="fix-header">
              <span class="badge category">${fix.category}</span>
              <span class="badge impact">Impact: ${fix.impact}</span>
              <span class="badge priority">Priority: ${fix.priority}/10</span>
              <span class="badge time">⏱ ${fix.estimatedTime}</span>
            </div>
            <div class="fix-title">${idx + 1}. ${fix.issue}</div>
            
            <div class="fix-section">
              <div class="fix-label">Current Value:</div>
              <div class="fix-value current">${fix.currentValue || 'Not set'}</div>
            </div>
            
            <div class="fix-section">
              <div class="fix-label">✅ Suggested Fix (Ready to Use):</div>
              <div class="fix-value suggested">${fix.suggestedValue}</div>
            </div>
            
            <div class="fix-section">
              <div class="fix-label">Why This Matters:</div>
              <div class="reasoning">${fix.reasoning}</div>
            </div>
          </div>
        `).join('')}
        ` : ''}

        ${lowPriorityFixes.length > 0 ? `
        <h2>🔵 Low Priority Fixes (${lowPriorityFixes.length})</h2>
        ${lowPriorityFixes.map((fix, idx) => `
          <div class="fix low">
            <div class="fix-header">
              <span class="badge category">${fix.category}</span>
              <span class="badge impact">Impact: ${fix.impact}</span>
              <span class="badge priority">Priority: ${fix.priority}/10</span>
              <span class="badge time">⏱ ${fix.estimatedTime}</span>
            </div>
            <div class="fix-title">${idx + 1}. ${fix.issue}</div>
            
            <div class="fix-section">
              <div class="fix-label">Current Value:</div>
              <div class="fix-value current">${fix.currentValue || 'Not set'}</div>
            </div>
            
            <div class="fix-section">
              <div class="fix-label">✅ Suggested Fix (Ready to Use):</div>
              <div class="fix-value suggested">${fix.suggestedValue}</div>
            </div>
            
            <div class="fix-section">
              <div class="fix-label">Why This Matters:</div>
              <div class="reasoning">${fix.reasoning}</div>
            </div>
          </div>
        `).join('')}
        ` : ''}

        <div class="footer">
          Generated by Echo5 Digital SEO Operations - AI-Powered SEO Analysis<br>
          Generated on ${new Date().toLocaleString()}<br>
          © Echo5 Digital ${new Date().getFullYear()} - All Rights Reserved
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

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
                <img src="/e5-white.png" alt="Echo5 Logo" className="w-10 h-10"/>
                <div>
                  <h2 className="text-2xl font-bold">Echo5 Digital AI-Powered SEO Fix Suggestions</h2>
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
                onClick={exportToPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                title="Export AI suggestions as PDF"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                <span>Export PDF</span>
              </button>
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
