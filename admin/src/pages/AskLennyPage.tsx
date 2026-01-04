import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
}

interface Source {
  id: string
  content_type: string
  title: string
  description: string
  url_or_path: string
  screenshot_url?: string
  similarity: number
}

const API_URL = 'http://localhost:8000'

export default function AskLennyPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm **Lenny**, your AccuLynx assistant. I can help you find features, understand workflows, and navigate the application.\n\nTry asking me things like:\n- \"How do I create an appointment?\"\n- \"Where can I upload photos?\"\n- \"What are supplements?\"\n- \"How do I manage labor tickets?\"",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSources, setShowSources] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          })),
          include_sources: true
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Inline code
        line = line.replace(/`(.*?)`/g, '<code class="bg-al-navy/10 px-1 rounded text-sm">$1</code>')
        // Lists
        if (line.startsWith('- ')) {
          return `<li class="ml-4">${line.slice(2)}</li>`
        }
        if (/^\d+\.\s/.test(line)) {
          return `<li class="ml-4 list-decimal">${line.replace(/^\d+\.\s/, '')}</li>`
        }
        return line ? `<p>${line}</p>` : '<br/>'
      })
      .join('')
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'page': return 'bg-blue-100 text-blue-800'
      case 'component': return 'bg-purple-100 text-purple-800'
      case 'action': return 'bg-cyan-100 text-cyan-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 overflow-hidden">
                <img src="/lenny.jpg" alt="Lenny" className="w-16 h-16 object-cover object-top scale-125" />
              </div>
              <div>
                <h1 className="text-white font-semibold">Ask Lenny</h1>
                <p className="text-white/50 text-xs">AccuLynx AI Assistant</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-green-400 text-sm">Online</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : ''}`}>
                {/* Avatar */}
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center overflow-hidden">
                      <img src="/lenny.jpg" alt="Lenny" className="w-10 h-10 object-cover object-top scale-125" />
                    </div>
                    <span className="text-white/40 text-xs">Lenny</span>
                  </div>
                )}
                
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                      : 'bg-white/10 backdrop-blur-sm text-white/90 border border-white/10'
                  }`}
                >
                  <div 
                    className="prose prose-sm prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                  />
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                      className="text-white/40 text-xs hover:text-white/60 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {message.sources.length} sources
                      <svg className={`w-3 h-3 transition-transform ${showSources === message.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showSources === message.id && (
                      <div className="mt-2 space-y-2">
                        {message.sources.map((source, i) => (
                          <div
                            key={i}
                            className="bg-black/20 rounded-lg p-3 border border-white/5"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${getTypeColor(source.content_type)}`}>
                                {source.content_type}
                              </span>
                              <span className="text-white/30 text-xs">
                                {Math.round(source.similarity * 100)}% match
                              </span>
                            </div>
                            <p className="text-white/80 text-sm font-medium">{source.title}</p>
                            <p className="text-white/40 text-xs mt-1">{source.url_or_path}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-white/30 text-xs mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-white/50 text-sm">Lenny is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/20 text-red-300 rounded-lg px-4 py-2 text-sm border border-red-500/30">
                ⚠️ {error}
                <button 
                  onClick={() => setError(null)}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Lenny about AccuLynx..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-5 py-3 font-medium transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-white/30 text-xs mt-2 text-center">
            Lenny uses AI to search AccuLynx documentation. Responses may not always be accurate.
          </p>
        </div>
      </div>

    </div>
  )
}

