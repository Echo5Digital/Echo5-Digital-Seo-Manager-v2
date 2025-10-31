import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import useAuthStore from '../store/auth'
import useClientStore from '../store/clients'
import useBlogStore from '../store/blogs'
import useKeywordStore from '../store/keywords'
import { jsPDF } from 'jspdf'
import { 
  DocumentTextIcon, 
  SparklesIcon, 
  CheckCircleIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'

export default function BlogCreator() {
  const { token, user } = useAuthStore()
  const { clients, fetchClients } = useClientStore()
  const { keywords, fetchKeywords } = useKeywordStore()
  const { 
    generateTitles, 
    generateContent, 
    createBlog,
    generatedTitles,
    generatingTitles,
    generatingContent,
    resetTitles
  } = useBlogStore()

  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const steps = [
    { number: 1, name: 'Client & Keyword', icon: Cog6ToothIcon },
    { number: 2, name: 'Choose Title', icon: PencilSquareIcon },
    { number: 3, name: 'Customize', icon: SparklesIcon },
    { number: 4, name: 'Generate', icon: DocumentTextIcon },
    { number: 5, name: 'Review', icon: CheckCircleIcon }
  ]

  // Step 1: Client & Keyword Selection
  const [selectedClient, setSelectedClient] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [secondaryKeywords, setSecondaryKeywords] = useState([''])
  const [tone, setTone] = useState('professional')

  // Step 2: Title Selection
  const [selectedTitle, setSelectedTitle] = useState('')
  const [customTitle, setCustomTitle] = useState('')

  // Step 3: Customization
  const [wordCount, setWordCount] = useState(1000)
  const [faqCount, setFaqCount] = useState(5)
  const [includeInternalLinks, setIncludeInternalLinks] = useState(true)

  // Step 4 & 5: Generated Content
  const [generatedBlog, setGeneratedBlog] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  // Task assignment modal
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskPriority, setTaskPriority] = useState('Medium')
  const [assigningTask, setAssigningTask] = useState(false)

  useEffect(() => {
    if (token) {
      fetchClients()
      fetchKeywords()
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

  // Filter keywords based on selected client
  const clientKeywords = selectedClient 
    ? keywords.filter(keyword => {
        // Handle both populated and unpopulated clientId
        const keywordClientId = typeof keyword.clientId === 'object' 
          ? keyword.clientId?._id 
          : keyword.clientId
        return keywordClientId === selectedClient
      })
    : []

  // Step 1 handlers
  const handleAddKeyword = () => {
    setSecondaryKeywords([...secondaryKeywords, ''])
  }

  const handleRemoveKeyword = (index) => {
    setSecondaryKeywords(secondaryKeywords.filter((_, i) => i !== index))
  }

  const handleKeywordChange = (index, value) => {
    const newKeywords = [...secondaryKeywords]
    newKeywords[index] = value
    setSecondaryKeywords(newKeywords)
  }

  const handleStep1Continue = async () => {
    if (!selectedClient || !focusKeyword.trim()) {
      alert('Please select a client and enter a focus keyword')
      return
    }

    // Generate titles
    const titles = await generateTitles(token, focusKeyword, selectedClient, { tone })
    if (titles && titles.length > 0) {
      setCurrentStep(2)
    }
  }

  // Step 2 handlers
  const handleTitleSelect = (title) => {
    setSelectedTitle(title)
    setCustomTitle(title)
  }

  const handleStep2Continue = () => {
    if (!customTitle.trim()) {
      alert('Please select or enter a blog title')
      return
    }
    setCurrentStep(3)
  }

  // Step 3 handlers
  const handleStep3Continue = () => {
    setCurrentStep(4)
    handleGenerateContent()
  }

  // Generate blog content
  const handleGenerateContent = async () => {
    const client = clients.find(c => c._id === selectedClient)
    
    const blogOptions = {
      title: customTitle,
      focusKeyword,
      secondaryKeywords: secondaryKeywords.filter(k => k.trim()),
      clientId: selectedClient,
      wordCount,
      tone,
      faqCount,
      includeInternalLinks
    }

    const content = await generateContent(token, blogOptions)
    if (content) {
      setGeneratedBlog(content)
      setCurrentStep(5)
    }
  }

  // Save blog
  const handleSaveBlog = async (status = 'draft') => {
    setSaving(true)
    setMessage('')

    try {
      const blogData = {
        clientId: selectedClient,
        title: customTitle,
        slug: generatedBlog.slug,
        metaTitle: generatedBlog.metaTitle,
        metaDescription: generatedBlog.metaDescription,
        focusKeyword,
        secondaryKeywords: secondaryKeywords.filter(k => k.trim()),
        semanticKeywords: generatedBlog.semanticKeywords,
        content: generatedBlog.content,
        headings: generatedBlog.headings,
        faqs: generatedBlog.faqs,
        internalLinks: generatedBlog.internalLinks || [],
        images: generatedBlog.imageAlts?.map((alt, idx) => ({
          url: '',
          alt: alt.alt1,
          altAlternative: alt.alt2,
          title: customTitle
        })) || [],
        status
      }

      const blog = await createBlog(token, blogData)
      if (blog) {
        setMessage('Brief saved successfully! View it in the Briefs tab.')
        setTimeout(() => {
          // Reset form
          resetForm()
        }, 2000)
      }
    } catch (error) {
      setMessage('Failed to save brief: ' + error.message)
    } finally {
      setSaving(false)
    }
  }
  
  // Export blog as PDF
  const handleExportPDF = () => {
    if (!generatedBlog) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const maxWidth = pageWidth - (margin * 2)
    let yPos = margin

    const checkNewPage = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPos = margin
      }
    }

    const splitText = (text, maxWidth) => {
      if (typeof doc.splitTextToSize === 'function') {
        return doc.splitTextToSize(text, maxWidth)
      }
      return [text]
    }

    // Helper function to render text with bold keywords
    const renderTextWithBoldKeywords = (text, keywords, fontSize = 9) => {
      if (!text || !keywords || keywords.length === 0) {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', 'normal')
        const lines = splitText(text, maxWidth)
        lines.forEach(line => {
          checkNewPage(5)
          doc.text(line, margin, yPos)
          yPos += 4
        })
        return
      }

      const keywordPattern = keywords
        .filter(k => k)
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')

      const lines = splitText(text, maxWidth)
      lines.forEach(line => {
        checkNewPage(5)
        const parts = []
        let lastIndex = 0
        let match

        const lineRegex = new RegExp(`\\b(${keywordPattern})\\b`, 'gi')
        
        while ((match = lineRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push({ text: line.substring(lastIndex, match.index), bold: false })
          }
          parts.push({ text: match[0], bold: true })
          lastIndex = match.index + match[0].length
        }
        
        if (lastIndex < line.length) {
          parts.push({ text: line.substring(lastIndex), bold: false })
        }

        if (parts.length === 0) {
          parts.push({ text: line, bold: false })
        }

        let xPos = margin
        doc.setFontSize(fontSize)
        
        parts.forEach(part => {
          doc.setFont('helvetica', part.bold ? 'bold' : 'normal')
          doc.text(part.text, xPos, yPos)
          xPos += doc.getTextWidth(part.text)
        })
        
        yPos += 4
      })
    }

    // Logo
    const logoWidth = 40
    const logoHeight = 20
    const logoX = (pageWidth - logoWidth) / 2
    try {
      doc.addImage('/echo5-logo.png', 'PNG', logoX, 5, logoWidth, logoHeight)
    } catch {}

    yPos = 30

    // Title
    doc.setFillColor(91, 33, 182)
    doc.rect(0, yPos - 5, pageWidth, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Blog Brief', pageWidth / 2, yPos + 3, { align: 'center' })
    
    yPos += 20

    // Meta info
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos)
    yPos += 8

    // Blog Title
    checkNewPage(15)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    const titleLines = splitText(customTitle || generatedBlog.metaTitle, maxWidth)
    titleLines.forEach(line => {
      doc.text(line, margin, yPos)
      yPos += 7
    })
    yPos += 5

    // Meta Description
    checkNewPage(12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    const metaLines = splitText(generatedBlog.metaDescription, maxWidth)
    metaLines.forEach(line => {
      doc.text(line, margin, yPos)
      yPos += 5
    })
    yPos += 10

    // SEO Info Box
    checkNewPage(30)
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPos, maxWidth, 25, 'F')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('SEO Information', margin + 3, yPos + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Focus Keyword: ${focusKeyword}`, margin + 3, yPos + 10)
    doc.text(`Word Count: ${generatedBlog.wordCount || 'N/A'}`, margin + 3, yPos + 14)
    doc.text(`Slug: ${generatedBlog.slug}`, margin + 3, yPos + 18)
    doc.text(`FAQs: ${generatedBlog.faqs?.length || 0}`, margin + 3, yPos + 22)
    yPos += 32

    // Content with H1, H2, H3 labels and bold keywords
    if (generatedBlog.content) {
      checkNewPage(15)
      doc.setFillColor(147, 51, 234)
      doc.rect(0, yPos - 5, pageWidth, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Blog Content', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      // Extract all keywords to bold
      const allKeywords = [
        focusKeyword,
        ...(secondaryKeywords || []),
        ...(generatedBlog.semanticKeywords || [])
      ].filter(k => k)

      // Parse HTML content
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = generatedBlog.content
      
      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.textContent.trim()
          if (!text) return
          renderTextWithBoldKeywords(text, allKeywords, 9)
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase()
          
          // Handle headings with highlighting
          if (tagName.match(/^h[1-6]$/)) {
            const level = tagName[1]
            const text = node.textContent.trim()
            
            checkNewPage(10)
            yPos += 3
            
            const bgColors = {
              '1': [147, 51, 234],   // Purple for H1
              '2': [59, 130, 246],   // Blue for H2
              '3': [16, 185, 129],   // Green for H3
              '4': [245, 158, 11],   // Orange for H4
              '5': [239, 68, 68],    // Red for H5
              '6': [107, 114, 128]   // Gray for H6
            }
            
            const color = bgColors[level] || [107, 114, 128]
            doc.setFillColor(...color)
            doc.rect(margin - 2, yPos - 5, maxWidth + 4, 8, 'F')
            
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(level === '1' ? 14 : level === '2' ? 12 : level === '3' ? 11 : 10)
            doc.setFont('helvetica', 'bold')
            doc.text(`${tagName.toUpperCase()}: ${text}`, margin, yPos)
            
            doc.setTextColor(0, 0, 0)
            yPos += 10
          }
          else if (tagName === 'p' || tagName === 'li') {
            Array.from(node.childNodes).forEach(processNode)
            yPos += 2
          }
          else {
            Array.from(node.childNodes).forEach(processNode)
          }
        }
      }
      
      Array.from(tempDiv.childNodes).forEach(processNode)
    }

    yPos += 10

    // FAQs
    if (generatedBlog.faqs && generatedBlog.faqs.length > 0) {
      checkNewPage(15)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Frequently Asked Questions:', margin, yPos)
      yPos += 8

      generatedBlog.faqs.forEach((faq, index) => {
        checkNewPage(20)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        const qLines = splitText(`Q${index + 1}: ${faq.question}`, maxWidth)
        qLines.forEach(line => {
          doc.text(line, margin, yPos)
          yPos += 5
        })

        doc.setFont('helvetica', 'normal')
        const aLines = splitText(`A: ${faq.answer}`, maxWidth)
        aLines.forEach(line => {
          checkNewPage(5)
          doc.text(line, margin, yPos)
          yPos += 4
        })
        yPos += 6
      })
    }

    yPos += 10

    // Semantic Keywords
    if (generatedBlog.semanticKeywords && generatedBlog.semanticKeywords.length > 0) {
      checkNewPage(15)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Semantic Keywords:', margin, yPos)
      yPos += 7
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const keywordsText = generatedBlog.semanticKeywords.join(', ')
      const keywordLines = splitText(keywordsText, maxWidth)
      keywordLines.forEach(line => {
        checkNewPage(5)
        doc.text(line, margin, yPos)
        yPos += 4
      })
      yPos += 8
    }

    // Image Alt Tags
    const hasImages = generatedBlog.imageAlts && generatedBlog.imageAlts.length > 0
    if (hasImages) {
      checkNewPage(20)
      doc.setFillColor(245, 158, 11)
      doc.rect(0, yPos - 5, pageWidth, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Image Alt Tags', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      doc.setTextColor(0, 0, 0)

      generatedBlog.imageAlts.forEach((altData, index) => {
        checkNewPage(15)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(91, 33, 182)
        doc.text(`Image ${index + 1}:`, margin, yPos)
        doc.setTextColor(0, 0, 0)
        yPos += 5

        if (altData.alt1) {
          doc.setFont('helvetica', 'normal')
          doc.setFillColor(243, 244, 246)
          const alt1Lines = splitText(`Alt Option 1: ${altData.alt1}`, maxWidth - 6)
          const alt1Height = alt1Lines.length * 4 + 4
          doc.rect(margin + 3, yPos - 3, maxWidth - 6, alt1Height, 'F')
          alt1Lines.forEach(line => {
            doc.text(line, margin + 5, yPos + 1)
            yPos += 4
          })
          yPos += 3
        }

        if (altData.alt2) {
          doc.setFont('helvetica', 'normal')
          doc.setFillColor(254, 243, 199)
          const alt2Lines = splitText(`Alt Option 2: ${altData.alt2}`, maxWidth - 6)
          const alt2Height = alt2Lines.length * 4 + 4
          doc.rect(margin + 3, yPos - 3, maxWidth - 6, alt2Height, 'F')
          alt2Lines.forEach(line => {
            doc.text(line, margin + 5, yPos + 1)
            yPos += 4
          })
          yPos += 3
        }

        yPos += 4
      })

      yPos += 10
    }

    // Schemas Note
    checkNewPage(25)
    doc.setFillColor(147, 51, 234)
    doc.rect(0, yPos - 5, pageWidth, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('SEO Schemas (JSON-LD)', pageWidth / 2, yPos + 2, { align: 'center' })
    yPos += 15
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const schemaNote = 'Article Schema, FAQ Schema, and Breadcrumb Schema will be automatically generated when you save this brief. These schemas will be available in the saved brief for easy copying to your website.'
    const schemaLines = splitText(schemaNote, maxWidth)
    schemaLines.forEach(line => {
      checkNewPage(5)
      doc.text(line, margin, yPos)
      yPos += 4
    })

    yPos += 10

    // Footer
    const footerY = pageHeight - 10
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    const footerText = `© Echo5 Digital ${new Date().getFullYear()} - All Rights Reserved`
    doc.textWithLink(footerText, pageWidth / 2, footerY, { 
      align: 'center',
      url: 'https://echo5digital.com/'
    })

    const fileName = `blog-${generatedBlog.slug || 'export'}-${new Date().getTime()}.pdf`
    doc.save(fileName)
  }

  // Assign blog writing task to staff
  const handleAssignTask = async () => {
    if (!selectedStaff || !generatedBlog) return

    setAssigningTask(true)

    try {
      const taskData = {
        clientId: selectedClient,
        title: `Write Blog: ${customTitle || generatedBlog.metaTitle}`,
        description: `**Blog Content Task**\n\nComplete the blog post based on the AI-generated outline:\n\n**Title:** ${customTitle || generatedBlog.metaTitle}\n**Focus Keyword:** ${focusKeyword}\n**Word Count Target:** ${wordCount} words\n**Tone:** ${tone}\n\n**Meta Description:**\n${generatedBlog.metaDescription}\n\n**Content Outline:**\n${generatedBlog.headings.h2?.map((h2, i) => `${i + 1}. ${h2}`).join('\n')}\n\n**FAQs to Include:**\n${generatedBlog.faqs?.map((faq, i) => `${i + 1}. ${faq.question}`).join('\n') || 'None'}\n\n**Semantic Keywords:** ${generatedBlog.semanticKeywords?.join(', ')}`,
        type: 'Content Writing',
        assignedTo: selectedStaff,
        priority: taskPriority,
        status: 'Pending',
        dueDate: taskDueDate || undefined
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
        setMessage('Task assigned successfully!')
        setShowTaskModal(false)
        setSelectedStaff('')
        setTaskDueDate('')
        setTaskPriority('Medium')
      } else {
        setMessage('Failed to assign task')
      }
    } catch (error) {
      setMessage('Error assigning task: ' + error.message)
    } finally {
      setAssigningTask(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setSelectedClient('')
    setFocusKeyword('')
    setSecondaryKeywords([''])
    setTone('professional')
    setSelectedTitle('')
    setCustomTitle('')
    setWordCount(1000)
    setFaqCount(5)
    setGeneratedBlog(null)
    resetTitles()
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
            Blog Creator
          </h1>
          <p className="text-gray-600 mt-1">Create SEO-optimized blog posts with AI assistance</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500' 
                        : isActive 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-500'
                          : 'bg-white border-gray-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircleIcon className="w-6 h-6 text-white" />
                      ) : (
                        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <span className={`text-xs font-medium mt-2 ${
                      isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Step 1: Select Client & Enter Keyword</h2>
            
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client *
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name} - {client.domain || client.website}
                  </option>
                ))}
              </select>
            </div>

            {/* Focus Keyword */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Focus Keyword * {selectedClient && clientKeywords.length > 0 && (
                  <span className="text-xs text-gray-500 font-normal">
                    ({clientKeywords.length} keyword{clientKeywords.length !== 1 ? 's' : ''} available)
                  </span>
                )}
              </label>
              <div className="space-y-2">
                <select
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={!selectedClient}
                >
                  <option value="">
                    {!selectedClient 
                      ? 'Please select a client first...' 
                      : clientKeywords.length === 0 
                      ? 'No keywords found for this client - type custom below...'
                      : 'Select a keyword or type custom below...'}
                  </option>
                  {clientKeywords.map((keyword) => (
                    <option key={keyword._id} value={keyword.keyword}>
                      {keyword.keyword} {keyword.volume ? `(${keyword.volume} searches)` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="Or type a custom keyword here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Main keyword to target in this blog post</p>
            </div>

            {/* Secondary Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Keywords (Optional)
              </label>
              {secondaryKeywords.map((keyword, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => handleKeywordChange(index, e.target.value)}
                    placeholder="e.g., SEO optimization tips"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {secondaryKeywords.length > 1 && (
                    <button
                      onClick={() => handleRemoveKeyword(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddKeyword}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add Secondary Keyword
              </button>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
                <option value="friendly">Friendly</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleStep1Continue}
                disabled={generatingTitles}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {generatingTitles ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Titles...
                  </>
                ) : (
                  <>
                    Continue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Remaining steps will be added in next part due to length... */}
        {currentStep > 1 && generatedTitles.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            Generating title suggestions... Please wait.
          </div>
        )}

        {/* Step 2: Choose Title */}
        {currentStep === 2 && generatedTitles.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Step 2: Choose a Blog Title</h2>
            
            <div className="grid gap-3">
              {generatedTitles.map((title, index) => (
                <div
                  key={index}
                  onClick={() => handleTitleSelect(title)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTitle === title
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedTitle === title
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedTitle === title && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{title}</p>
                      <p className="text-xs text-gray-500 mt-1">{title.length} characters</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or customize your title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter custom blog title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleStep2Continue}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                Continue
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Customize Options */}
        {currentStep === 3 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Step 3: Customize Blog Options</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Word Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Word Count (content only)
                </label>
                <input
                  type="number"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value))}
                  min="300"
                  max="5000"
                  step="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 800-1500 words</p>
              </div>

              {/* FAQ Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of FAQs
                </label>
                <input
                  type="number"
                  value={faqCount}
                  onChange={(e) => setFaqCount(parseInt(e.target.value))}
                  min="0"
                  max="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">0 to skip FAQ section</p>
              </div>
            </div>

            {/* Internal Links */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="internalLinks"
                checked={includeInternalLinks}
                onChange={(e) => setIncludeInternalLinks(e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="internalLinks" className="text-sm font-medium text-gray-700">
                Include internal linking suggestions
              </label>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Blog Summary</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li><strong>Title:</strong> {customTitle}</li>
                <li><strong>Focus Keyword:</strong> {focusKeyword}</li>
                <li><strong>Word Count:</strong> ~{wordCount} words</li>
                <li><strong>FAQs:</strong> {faqCount} questions</li>
                <li><strong>Client:</strong> {clients.find(c => c._id === selectedClient)?.name}</li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleStep3Continue}
                disabled={generatingContent}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {generatingContent ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Blog...
                  </>
                ) : (
                  <>
                    Generate Blog
                    <SparklesIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Generating... */}
        {currentStep === 4 && generatingContent && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin h-16 w-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Blog Post...</h2>
            <p className="text-gray-600">This may take 30-60 seconds. We're creating SEO-optimized content, FAQs, meta data, and schemas.</p>
          </div>
        )}

        {/* Step 5: Review & Publish */}
        {currentStep === 5 && generatedBlog && (
          <div className="space-y-6">
            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Meta Information */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">SEO Meta Data</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title ({generatedBlog.metaTitle.length}/60)</label>
                <input
                  type="text"
                  value={generatedBlog.metaTitle}
                  onChange={(e) => setGeneratedBlog({...generatedBlog, metaTitle: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  maxLength="60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description ({generatedBlog.metaDescription.length}/160)</label>
                <textarea
                  value={generatedBlog.metaDescription}
                  onChange={(e) => setGeneratedBlog({...generatedBlog, metaDescription: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="2"
                  maxLength="160"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={generatedBlog.slug}
                  onChange={(e) => setGeneratedBlog({...generatedBlog, slug: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
            </div>

            {/* Blog Content Preview */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Blog Content</h2>
              <div className="prose max-w-none">
                <style jsx>{`
                  .prose ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                  }
                  .prose ul li {
                    margin: 0.5rem 0;
                  }
                  .prose ul li::marker {
                    color: #9333ea;
                  }
                `}</style>
                <div dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    // Get all keywords to highlight
                    const allKeywords = [
                      focusKeyword,
                      ...(secondaryKeywords || []),
                      ...(generatedBlog.semanticKeywords || [])
                    ].filter(k => k)

                    let processedContent = generatedBlog.content

                    // Add visual labels to headings
                    processedContent = processedContent
                      .replace(/<h1([^>]*)>(.*?)<\/h1>/gi, '<h1$1><span style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); color: white; padding: 4px 12px; border-radius: 6px; font-size: 0.9em; margin-right: 8px; font-weight: bold;">H1:</span>$2</h1>')
                      .replace(/<h2([^>]*)>(.*?)<\/h2>/gi, '<h2$1><span style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 3px 10px; border-radius: 5px; font-size: 0.85em; margin-right: 8px; font-weight: bold;">H2:</span>$2</h2>')
                      .replace(/<h3([^>]*)>(.*?)<\/h3>/gi, '<h3$1><span style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-right: 6px; font-weight: bold;">H3:</span>$2</h3>')
                      .replace(/<h4([^>]*)>(.*?)<\/h4>/gi, '<h4$1><span style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-right: 6px; font-weight: bold;">H4:</span>$2</h4>')
                      .replace(/<h5([^>]*)>(.*?)<\/h5>/gi, '<h5$1><span style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.7em; margin-right: 4px; font-weight: bold;">H5:</span>$2</h5>')
                      .replace(/<h6([^>]*)>(.*?)<\/h6>/gi, '<h6$1><span style="display: inline-block; background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.7em; margin-right: 4px; font-weight: bold;">H6:</span>$2</h6>')

                    // Bold all keywords in the content
                    allKeywords.forEach(keyword => {
                      if (keyword) {
                        // Create regex that matches whole words only and is case-insensitive
                        const regex = new RegExp(`\\b(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
                        // Replace outside of HTML tags and heading labels
                        processedContent = processedContent.replace(regex, (match) => {
                          return `<strong style="font-weight: 700;">${match}</strong>`
                        })
                      }
                    })

                    return processedContent
                  })()
                }} />
              </div>
            </div>

            {/* FAQs */}
            {generatedBlog.faqs && generatedBlog.faqs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">FAQs ({generatedBlog.faqs.length})</h2>
                <div className="space-y-4">
                  {generatedBlog.faqs.map((faq, index) => (
                    <div key={index} className="border-l-4 border-purple-500 pl-4">
                      <h4 className="font-semibold text-gray-900">{faq.question}</h4>
                      <p className="text-gray-700 mt-1">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Semantic Keywords 
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Naturally integrated in content)
                </span>
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                These keywords have been woven naturally throughout your blog content for better SEO performance:
              </p>
              <div className="flex flex-wrap gap-2">
                {generatedBlog.semanticKeywords?.map((keyword, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Image Alt Texts */}
            {generatedBlog.imageAlts && generatedBlog.imageAlts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Suggested Image Alt Texts</h2>
                <div className="space-y-3">
                  {generatedBlog.imageAlts.map((alt, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <p className="text-sm font-medium text-gray-700">Image {alt.position}:</p>
                      <p className="text-sm text-gray-600 mt-1"><strong>Option 1:</strong> {alt.alt1}</p>
                      <p className="text-sm text-gray-600"><strong>Option 2:</strong> {alt.alt2}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schemas Info */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg shadow-sm p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">SEO Schemas</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Article Schema, FAQ Schema, and Breadcrumb Schema will be automatically generated when you save this brief. 
                    These structured data schemas help search engines understand your content better and enable rich search results.
                  </p>
                  <p className="text-xs text-gray-600">
                    💡 Tip: After saving, you'll be able to copy the schemas from the brief detail page and add them to your website's HTML.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div className="flex flex-col gap-4">
                {/* Top row: Export and Assign buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Export as PDF
                  </button>
                  
                  {canAssignTasks() && (
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg"
                    >
                      <UserPlusIcon className="w-5 h-5" />
                      Assign as Task
                    </button>
                  )}
                </div>

                {/* Bottom row: Regenerate and Save/Publish buttons */}
                <div className="flex justify-between items-center border-t pt-4">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Regenerate
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSaveBlog('draft')}
                      disabled={saving}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Brief'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Assignment Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Blog Writing Task</h3>
            
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
    </Layout>
  )
}
