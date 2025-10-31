import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/auth'
import useBlogStore from '../../store/blogs'
import { jsPDF } from 'jspdf'
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

export default function BriefDetail() {
  const router = useRouter()
  const { id } = router.query
  const { token } = useAuthStore()
  const { currentBlog, loading, fetchBlog, updateBlog, deleteBlog } = useBlogStore()
  
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [message, setMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (id && token) {
      fetchBlog(token, id)
    }
  }, [id, token])

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    setMessage('')

    try {
      await updateBlog(token, id, { status: newStatus })
      await fetchBlog(token, id) // Refresh the data
      setMessage(`Status updated to ${newStatus}!`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Failed to update status: ' + error.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this brief?')) {
      await deleteBlog(token, id)
      router.push('/briefs')
    }
  }

  const handleExportPDF = () => {
    if (!currentBlog || isExporting) return

    setIsExporting(true)

    try {
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

      // Create regex pattern for all keywords
      const keywordPattern = keywords
        .filter(k => k)
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')
      const regex = new RegExp(`\\b(${keywordPattern})\\b`, 'gi')

      const lines = splitText(text, maxWidth)
      lines.forEach(line => {
        checkNewPage(5)
        const parts = []
        let lastIndex = 0
        let match

        // Reset regex
        const lineRegex = new RegExp(`\\b(${keywordPattern})\\b`, 'gi')
        
        while ((match = lineRegex.exec(line)) !== null) {
          // Add text before match
          if (match.index > lastIndex) {
            parts.push({ text: line.substring(lastIndex, match.index), bold: false })
          }
          // Add matched keyword
          parts.push({ text: match[0], bold: true })
          lastIndex = match.index + match[0].length
        }
        
        // Add remaining text
        if (lastIndex < line.length) {
          parts.push({ text: line.substring(lastIndex), bold: false })
        }

        // If no keywords found, just add the whole line
        if (parts.length === 0) {
          parts.push({ text: line, bold: false })
        }

        // Render parts with appropriate styling
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
      const titleLines = splitText(currentBlog.title || currentBlog.metaTitle, maxWidth)
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
      const metaLines = splitText(currentBlog.metaDescription, maxWidth)
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
      doc.text(`Focus Keyword: ${currentBlog.focusKeyword}`, margin + 3, yPos + 10)
      doc.text(`Word Count: ${currentBlog.wordCount || 'N/A'}`, margin + 3, yPos + 14)
      doc.text(`Slug: ${currentBlog.slug}`, margin + 3, yPos + 18)
      doc.text(`Status: ${currentBlog.status}`, margin + 3, yPos + 22)
      yPos += 32

      // Content
      if (currentBlog.content) {
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
          currentBlog.focusKeyword,
          ...(currentBlog.secondaryKeywords || []),
          ...(currentBlog.semanticKeywords || [])
        ].filter(k => k)

        // Parse HTML content and extract structured sections
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = currentBlog.content
        
        const processNode = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent.trim()
            if (!text) return
            
            // Render text with bold keywords
            renderTextWithBoldKeywords(text, allKeywords, 9)
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase()
            
            // Handle headings with highlighting
            if (tagName.match(/^h[1-6]$/)) {
              const level = tagName[1]
              const text = node.textContent.trim()
              
              checkNewPage(10)
              yPos += 3
              
              // Highlight background for headings
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
            // Handle paragraphs and lists
            else if (tagName === 'p' || tagName === 'li') {
              Array.from(node.childNodes).forEach(processNode)
              yPos += 2
            }
            // Handle other elements recursively
            else {
              Array.from(node.childNodes).forEach(processNode)
            }
          }
        }
        
        Array.from(tempDiv.childNodes).forEach(processNode)
      }

      yPos += 10

      // FAQs
      if (currentBlog.faqs && currentBlog.faqs.length > 0) {
        checkNewPage(15)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Frequently Asked Questions:', margin, yPos)
        yPos += 8

        currentBlog.faqs.forEach((faq, index) => {
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
      if (currentBlog.semanticKeywords && currentBlog.semanticKeywords.length > 0) {
        checkNewPage(15)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Semantic Keywords:', margin, yPos)
        yPos += 7
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const keywordsText = currentBlog.semanticKeywords.join(', ')
        const keywordLines = splitText(keywordsText, maxWidth)
        keywordLines.forEach(line => {
          checkNewPage(5)
          doc.text(line, margin, yPos)
          yPos += 4
        })
        yPos += 8
      }

      // Image Alt Tags
      const hasImages = (currentBlog.featuredImage?.alt) || (currentBlog.images && currentBlog.images.length > 0)
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

        // Featured Image Alt
        if (currentBlog.featuredImage?.alt) {
          checkNewPage(12)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('Featured Image:', margin, yPos)
          yPos += 6
          
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setFillColor(243, 244, 246)
          doc.rect(margin, yPos - 3, maxWidth, 10, 'F')
          doc.text(`Alt: ${currentBlog.featuredImage.alt}`, margin + 2, yPos + 2)
          yPos += 12
        }

        // Additional Images
        if (currentBlog.images && currentBlog.images.length > 0) {
          checkNewPage(12)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('Content Images:', margin, yPos)
          yPos += 6

          currentBlog.images.forEach((image, index) => {
            if (image.alt || image.altAlternative) {
              checkNewPage(15)
              doc.setFontSize(9)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(91, 33, 182)
              doc.text(`Image ${index + 1}:`, margin, yPos)
              doc.setTextColor(0, 0, 0)
              yPos += 5

              if (image.alt) {
                doc.setFont('helvetica', 'normal')
                doc.setFillColor(243, 244, 246)
                const altLines = splitText(`Alt Option 1: ${image.alt}`, maxWidth - 6)
                const altHeight = altLines.length * 4 + 4
                doc.rect(margin + 3, yPos - 3, maxWidth - 6, altHeight, 'F')
                altLines.forEach(line => {
                  doc.text(line, margin + 5, yPos + 1)
                  yPos += 4
                })
                yPos += 3
              }

              if (image.altAlternative) {
                doc.setFont('helvetica', 'normal')
                doc.setFillColor(254, 243, 199)
                const altAltLines = splitText(`Alt Option 2: ${image.altAlternative}`, maxWidth - 6)
                const altAltHeight = altAltLines.length * 4 + 4
                doc.rect(margin + 3, yPos - 3, maxWidth - 6, altAltHeight, 'F')
                altAltLines.forEach(line => {
                  doc.text(line, margin + 5, yPos + 1)
                  yPos += 4
                })
                yPos += 3
              }

              yPos += 4
            }
          })
        }

        yPos += 10
      }

      // Schemas
      if (currentBlog.schemas) {
        checkNewPage(20)
        doc.setFillColor(147, 51, 234)
        doc.rect(0, yPos - 5, pageWidth, 12, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('SEO Schemas (JSON-LD)', pageWidth / 2, yPos + 2, { align: 'center' })
        yPos += 15

        // Article Schema
        if (currentBlog.schemas.article) {
          checkNewPage(15)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('Article Schema:', margin, yPos)
          yPos += 6

          doc.setFontSize(7)
          doc.setFont('courier', 'normal')
          const articleSchema = JSON.stringify(currentBlog.schemas.article, null, 2)
          const articleLines = splitText(articleSchema, maxWidth - 5)
          articleLines.forEach(line => {
            checkNewPage(4)
            doc.text(line, margin + 2, yPos)
            yPos += 3.5
          })
          yPos += 5
        }

        // FAQ Schema
        if (currentBlog.schemas.faq) {
          checkNewPage(15)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('FAQ Schema:', margin, yPos)
          yPos += 6

          doc.setFontSize(7)
          doc.setFont('courier', 'normal')
          const faqSchema = JSON.stringify(currentBlog.schemas.faq, null, 2)
          const faqLines = splitText(faqSchema, maxWidth - 5)
          faqLines.forEach(line => {
            checkNewPage(4)
            doc.text(line, margin + 2, yPos)
            yPos += 3.5
          })
          yPos += 5
        }

        // Breadcrumb Schema
        if (currentBlog.schemas.breadcrumb) {
          checkNewPage(15)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('Breadcrumb Schema:', margin, yPos)
          yPos += 6

          doc.setFontSize(7)
          doc.setFont('courier', 'normal')
          const breadcrumbSchema = JSON.stringify(currentBlog.schemas.breadcrumb, null, 2)
          const breadcrumbLines = splitText(breadcrumbSchema, maxWidth - 5)
          breadcrumbLines.forEach(line => {
            checkNewPage(4)
            doc.text(line, margin + 2, yPos)
            yPos += 3.5
          })
          yPos += 5
        }
      }

      // Footer
      const footerY = pageHeight - 10
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      const footerText = `© Echo5 Digital ${new Date().getFullYear()} - All Rights Reserved`
      doc.textWithLink(footerText, pageWidth / 2, footerY, { 
        align: 'center',
        url: 'https://echo5digital.com/'
      })

      const fileName = `brief-${currentBlog.slug || 'export'}-${new Date().getTime()}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      // Reset the exporting state after a short delay to prevent rapid re-clicks
      setTimeout(() => setIsExporting(false), 1000)
    }
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

  if (loading || !currentBlog) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading brief...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/briefs')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-2">
                  <DocumentTextIcon className="w-8 h-8 text-white" />
                </div>
                Brief Details
              </h1>
              <p className="text-gray-600 mt-1">View and manage blog brief</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Export PDF
                </>
              )}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
            >
              <TrashIcon className="w-5 h-5" />
              Delete
            </button>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('Failed') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Status Management */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Management</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Current Status:</span>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(currentBlog.status)}`}>
              {currentBlog.status || 'draft'}
            </span>
            <div className="flex gap-2 ml-auto">
              {currentBlog.status !== 'draft' && (
                <button
                  onClick={() => handleStatusChange('draft')}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all disabled:opacity-50"
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                  Mark as Draft
                </button>
              )}
              {currentBlog.status !== 'published' && (
                <button
                  onClick={() => handleStatusChange('published')}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  {updatingStatus ? 'Updating...' : 'Mark as Published'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">SEO Meta Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {currentBlog.title || currentBlog.metaTitle}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
                {currentBlog.slug}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {currentBlog.metaDescription}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {currentBlog.focusKeyword}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Word Count</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {currentBlog.wordCount || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {typeof currentBlog.clientId === 'object' ? currentBlog.clientId?.name : 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {new Date(currentBlog.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Blog Content */}
        {currentBlog.content && (
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
                    currentBlog.focusKeyword,
                    ...(currentBlog.secondaryKeywords || []),
                    ...(currentBlog.semanticKeywords || [])
                  ].filter(k => k)

                  let processedContent = currentBlog.content

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
                        // Don't replace if already inside a tag or style attribute
                        return `<strong style="font-weight: 700;">${match}</strong>`
                      })
                    }
                  })

                  return processedContent
                })()
              }} />
            </div>
          </div>
        )}

        {/* FAQs */}
        {currentBlog.faqs && currentBlog.faqs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">FAQs ({currentBlog.faqs.length})</h2>
            <div className="space-y-4">
              {currentBlog.faqs.map((faq, index) => (
                <div key={index} className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-900">{faq.question}</h4>
                  <p className="text-gray-700 mt-1">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Semantic Keywords */}
        {currentBlog.semanticKeywords && currentBlog.semanticKeywords.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Semantic Keywords 
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Naturally integrated in content)
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {currentBlog.semanticKeywords.map((keyword, index) => (
                <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Keywords */}
        {currentBlog.secondaryKeywords && currentBlog.secondaryKeywords.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Secondary Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {currentBlog.secondaryKeywords.map((keyword, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Image Alt Tags */}
        {((currentBlog.featuredImage?.alt) || (currentBlog.images && currentBlog.images.length > 0)) && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Image Alt Tags</h2>
            
            {/* Featured Image */}
            {currentBlog.featuredImage?.alt && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Featured Image</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Alt Text:</span> {currentBlog.featuredImage.alt}
                  </p>
                </div>
              </div>
            )}

            {/* Content Images */}
            {currentBlog.images && currentBlog.images.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Content Images</h3>
                <div className="space-y-4">
                  {currentBlog.images.map((image, index) => (
                    (image.alt || image.altAlternative) && (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-purple-600 mb-2">Image {index + 1}</h4>
                        {image.alt && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium text-gray-900">Alt Option 1:</span> {image.alt}
                            </p>
                          </div>
                        )}
                        {image.altAlternative && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium text-gray-900">Alt Option 2:</span> {image.altAlternative}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEO Schemas */}
        {currentBlog.schemas && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">SEO Schemas (JSON-LD)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Copy and paste these schemas into the <code className="px-1 py-0.5 bg-gray-100 rounded">&lt;head&gt;</code> section of your blog post HTML to enable rich search results.
            </p>
            
            {/* Article Schema */}
            {currentBlog.schemas.article && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">Article Schema</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(currentBlog.schemas.article, null, 2))
                      alert('Article schema copied to clipboard!')
                    }}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-xs">
                  <code>{JSON.stringify(currentBlog.schemas.article, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* FAQ Schema */}
            {currentBlog.schemas.faq && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">FAQ Schema</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(currentBlog.schemas.faq, null, 2))
                      alert('FAQ schema copied to clipboard!')
                    }}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-xs">
                  <code>{JSON.stringify(currentBlog.schemas.faq, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* Breadcrumb Schema */}
            {currentBlog.schemas.breadcrumb && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">Breadcrumb Schema</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(currentBlog.schemas.breadcrumb, null, 2))
                      alert('Breadcrumb schema copied to clipboard!')
                    }}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-xs">
                  <code>{JSON.stringify(currentBlog.schemas.breadcrumb, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* Copy All Schemas */}
            {(currentBlog.schemas.article || currentBlog.schemas.faq || currentBlog.schemas.breadcrumb) && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    const allSchemas = []
                    if (currentBlog.schemas.article) allSchemas.push(currentBlog.schemas.article)
                    if (currentBlog.schemas.faq) allSchemas.push(currentBlog.schemas.faq)
                    if (currentBlog.schemas.breadcrumb) allSchemas.push(currentBlog.schemas.breadcrumb)
                    
                    const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(allSchemas, null, 2)}\n</script>`
                    navigator.clipboard.writeText(scriptTag)
                    alert('All schemas copied as a single script tag!')
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  Copy All Schemas as Script Tag
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Copies all schemas wrapped in a single &lt;script type="application/ld+json"&gt; tag
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
