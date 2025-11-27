import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useChatStore from '../../store/chat'

/**
 * Modern Siri-like Wave Animation for minimized state
 */
const SiriWaveButton = ({ onClick, hasUnread, isProcessing }) => {
  return (
    <motion.button
      onClick={onClick}
      className="relative group"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
    >
      {/* Outer ambient glow */}
      <motion.div
        className="absolute -inset-3 rounded-full opacity-60"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 70%)'
        }}
      />

      {/* Main container */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden shadow-2xl border border-white/10">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B8DD6 100%)',
              'linear-gradient(135deg, #764ba2 0%, #667eea 50%, #f093fb 100%)',
              'linear-gradient(135deg, #6B8DD6 0%, #8E54E9 50%, #667eea 100%)',
              'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B8DD6 100%)'
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Siri-like wave bars */}
        <div className="absolute inset-0 flex items-center justify-center gap-[3px]">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-[3px] bg-white/90 rounded-full"
              animate={{
                height: isProcessing 
                  ? ['8px', '24px', '12px', '20px', '8px']
                  : ['12px', '20px', '14px', '18px', '12px'],
                opacity: [0.7, 1, 0.8, 1, 0.7]
              }}
              transition={{
                duration: isProcessing ? 0.6 : 1.5,
                repeat: Infinity,
                delay: i * 0.12,
                ease: "easeInOut"
              }}
              style={{
                boxShadow: '0 0 8px rgba(255,255,255,0.5)'
              }}
            />
          ))}
        </div>

        {/* Subtle glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        
        {/* Inner glow ring */}
        <motion.div
          className="absolute inset-1 rounded-full border border-white/20"
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Unread notification badge */}
      {hasUnread && (
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
        >
          <motion.span 
            className="w-2 h-2 bg-white rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.span>
      )}

      {/* Hover tooltip */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
        <div className="bg-slate-900/95 text-white text-sm px-4 py-2 rounded-xl shadow-xl whitespace-nowrap backdrop-blur-sm border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-purple-400">✨</span>
            <span className="font-medium">Echo5 AI Assistant</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Click to chat</div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-slate-900/95 rotate-45 border-r border-t border-white/10" />
      </div>
    </motion.button>
  )
}

/**
 * Siri-like animated orb visualization (for chat header)
 */
const SiriOrb = ({ isActive, isListening, isTyping }) => {
  return (
    <div className="relative w-16 h-16">
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: isActive ? [1, 1.3, 1] : 1,
          opacity: isActive ? [0.3, 0.1, 0.3] : 0.1
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
        }}
      />
      
      {/* Middle pulse ring */}
      <motion.div
        className="absolute inset-2 rounded-full"
        animate={{
          scale: isTyping ? [1, 1.15, 1] : isListening ? [1, 1.2, 1] : 1,
          opacity: isActive ? [0.5, 0.2, 0.5] : 0.2
        }}
        transition={{
          duration: isListening ? 0.8 : 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%)'
        }}
      />

      {/* Inner core */}
      <motion.div
        className="absolute inset-3 rounded-full shadow-lg"
        animate={{
          scale: isListening ? [0.95, 1.05, 0.95] : 1
        }}
        transition={{
          duration: 0.6,
          repeat: isListening ? Infinity : 0,
          ease: "easeInOut"
        }}
        style={{
          background: isListening 
            ? 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #06B6D4 100%)'
            : isTyping
              ? 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)'
              : 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'
        }}
      />

      {/* Sparkle effect */}
      {(isListening || isTyping) && (
        <motion.div
          className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Voice waves (when listening) */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-0.5 bg-white rounded-full"
                animate={{
                  height: ['8px', '16px', '8px']
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI icon when idle */}
      {!isListening && !isTyping && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
    </div>
  )
}

/**
 * Floating Chat Button with Siri-like animation (legacy - kept for reference)
 */
const ChatButton = ({ onClick, hasUnread, isTyping }) => {
  return (
    <motion.button
      onClick={onClick}
      className="relative group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Background glow on hover */}
      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-30 blur-lg transition-opacity" />
      
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-full p-2 shadow-2xl border border-slate-700">
        <SiriOrb isActive={true} isListening={false} isTyping={isTyping} />
      </div>

      {/* Unread indicator */}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
          Echo5 AI Assistant
        </div>
      </div>
    </motion.button>
  )
}

/**
 * Message component with typing animation
 */
const ChatMessage = ({ message, index, onFeedback, onPin, onButtonClick }) => {
  const isUser = message.role === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-500 to-blue-500'
      }`}>
        {isUser ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-2.5 ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-md' 
            : 'bg-slate-700 text-slate-100 rounded-bl-md'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Button suggestions */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.buttons.map((btn, i) => (
              <button
                key={i}
                onClick={() => onButtonClick(btn.action)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  btn.style === 'primary'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Follow-up suggestions */}
        {message.followUps && message.followUps.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.followUps.map((followUp, i) => (
              <button
                key={i}
                onClick={() => onButtonClick(followUp)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-500 hover:border-blue-500 hover:text-blue-400 text-slate-300 transition-colors"
              >
                {followUp}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp and actions */}
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
          {message.timestamp && (
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          {message.inputType === 'voice' && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
              </svg>
              Voice
            </span>
          )}
          
          {/* Feedback buttons (only for assistant messages) */}
          {!isUser && (
            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onFeedback(index, 'positive')}
                className={`p-1 rounded ${message.feedback === 'positive' ? 'text-green-400' : 'hover:text-green-400'}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
              </button>
              <button
                onClick={() => onFeedback(index, 'negative')}
                className={`p-1 rounded ${message.feedback === 'negative' ? 'text-red-400' : 'hover:text-red-400'}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                </svg>
              </button>
              <button
                onClick={() => onPin(index)}
                className={`p-1 rounded ${message.isPinned ? 'text-yellow-400' : 'hover:text-yellow-400'}`}
              >
                <svg className="w-3 h-3" fill={message.isPinned ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Typing indicator component
 */
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex gap-3"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
    <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-slate-400 rounded-full"
            animate={{
              y: ['0%', '-50%', '0%']
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  </motion.div>
)

/**
 * Voice input component
 */
const VoiceInput = ({ onTranscript, onCancel }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        setTranscript(finalTranscript || interimTranscript)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true)
      setTranscript('')
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      if (transcript) {
        onTranscript(transcript)
      }
    }
  }

  const handleCancel = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setTranscript('')
    onCancel()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900/98 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl"
    >
      {/* Siri Orb */}
      <SiriOrb isActive={true} isListening={isListening} isTyping={false} />
      
      {/* Status text */}
      <p className="text-slate-300 mt-4 text-sm">
        {isListening ? 'Listening...' : 'Tap to speak'}
      </p>

      {/* Transcript preview */}
      {transcript && (
        <p className="text-white mt-4 px-6 text-center max-w-md">{transcript}</p>
      )}

      {/* Controls */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-6 py-2 rounded-full text-white text-sm transition-colors ${
            isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isListening ? 'Send' : 'Start'}
        </button>
      </div>

      {/* Microphone availability warning */}
      {!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window) && (
        <p className="text-yellow-400 text-xs mt-4">Voice input not supported in this browser</p>
      )}
    </motion.div>
  )
}

/**
 * Chat History Sidebar
 */
const ChatHistory = ({ history, onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const { searchHistory } = useChatStore()
  const [searchResults, setSearchResults] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (searchQuery.length >= 2) {
      const results = await searchHistory(searchQuery)
      setSearchResults(results)
    }
  }

  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-y-0 left-0 w-72 bg-slate-800 border-r border-slate-700 flex flex-col z-20"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Chat History</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="p-3 border-b border-slate-700">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value.length < 2) setSearchResults(null)
            }}
            placeholder="Search history..."
            className="w-full pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </form>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        {searchResults ? (
          // Search results
          <div className="p-2">
            <p className="text-xs text-slate-400 px-2 mb-2">{searchResults.length} results</p>
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => onSelect(result.sessionId)}
                className="w-full text-left p-3 hover:bg-slate-700 rounded-lg mb-1"
              >
                <p className="text-sm text-white truncate">{result.content}</p>
                <p className="text-xs text-slate-400">{result.sessionDate}</p>
              </button>
            ))}
          </div>
        ) : (
          // History list
          <div className="p-2">
            {history.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelect(session.id)}
                className="w-full text-left p-3 hover:bg-slate-700 rounded-lg mb-1 group"
              >
                <p className="text-sm text-white truncate group-hover:text-blue-400 transition-colors">
                  {session.title || `Chat on ${session.date}`}
                </p>
                <p className="text-xs text-slate-400">{session.date}</p>
              </button>
            ))}
            {history.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">No previous chats</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Main Chat Window Component
 */
const ChatWindow = ({ onClose }) => {
  const {
    messages,
    isTyping,
    session,
    history,
    historyOpen,
    inputMode,
    settings,
    sendMessage,
    sendButtonAction,
    submitFeedback,
    togglePin,
    loadHistory,
    loadSession,
    setHistoryOpen,
    setInputMode
  } = useChatStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load history
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    
    await sendMessage(input.trim())
    setInput('')
  }

  const handleButtonClick = (action) => {
    sendButtonAction(action)
  }

  const handleVoiceTranscript = (transcript) => {
    sendMessage(transcript, 'voice')
    setInputMode('text')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-24 right-6 w-[420px] h-[600px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col z-50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHistoryOpen(true)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Chat History"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <div>
            <h3 className="font-semibold text-white">Echo5 Assistant</h3>
            <p className="text-xs text-slate-400">
              {session?.date === new Date().toISOString().split('T')[0] ? 'Today' : session?.date}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <SiriOrb isActive={true} isListening={false} isTyping={isTyping} />
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            index={i}
            onFeedback={submitFeedback}
            onPin={togglePin}
            onButtonClick={handleButtonClick}
          />
        ))}
        
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />

        {/* History sidebar */}
        <AnimatePresence>
          {historyOpen && (
            <ChatHistory
              history={history}
              onSelect={loadSession}
              onClose={() => setHistoryOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            className="p-2.5 rounded-full transition-colors hover:bg-slate-700 text-slate-400 hover:text-purple-400"
            title="Voice input"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 bg-slate-700 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        
        {/* Quick actions */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {['My Tasks', 'Daily Summary', 'Help'].map((action) => (
            <button
              key={action}
              onClick={() => handleButtonClick(action)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Voice input overlay - positioned over entire chat window */}
      <AnimatePresence>
        {inputMode === 'voice' && (
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            onCancel={() => setInputMode('text')}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Main ChatWidget Component
 */
export default function ChatWidget() {
  const { isOpen, toggleOpen, isTyping, initSession, loadSettings } = useChatStore()

  // Initialize on mount
  useEffect(() => {
    loadSettings()
    initSession()
  }, [initSession, loadSettings])

  return (
    <>
      {/* Floating Siri-like button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <SiriWaveButton 
              onClick={toggleOpen}
              hasUnread={false}
              isProcessing={isTyping}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && <ChatWindow onClose={toggleOpen} />}
      </AnimatePresence>
    </>
  )
}
