import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
  isStreaming?: boolean
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

// Source type labels
const SOURCE_LABELS: Record<string, string> = {
  article: 'KB',
  page: 'Page',
  component: 'Component',
  action: 'Action'
}

// Use relative path for Vercel deployment, or localhost for dev
const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : ''

export default function AskLennyPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm **Lenny**, your AccuLynx assistant. I can help you find features, understand workflows, and navigate the application.\n\nTry asking me things like:\n- \"Where can I take a payment?\"\n- \"How do I create an appointment?\"\n- \"What are supplements?\"",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSources, setExpandedSources] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    const assistantMessageId = (Date.now() + 1).toString()

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Local dev uses FastAPI endpoint, Vercel uses serverless function
      const endpoint = import.meta.env.DEV ? '/chat/stream' : '/api/chat'
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          })),
          include_sources: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let streamedContent = ''
      let sources: Source[] = []

      // Add empty assistant message that we'll stream into
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        sources: [],
        timestamp: new Date(),
        isStreaming: true
      }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'sources') {
                sources = data.sources
                
                // Update message with sources
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, sources } 
                    : m
                ))
              } else if (data.type === 'content') {
                streamedContent += data.text
                
                // Update message content
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, content: streamedContent } 
                    : m
                ))
              } else if (data.type === 'done') {
                // Mark as not streaming
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, isStreaming: false } 
                    : m
                ))
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to get response')
      console.error('Chat error:', err)
      
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        line = line.replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        if (line.startsWith('- ')) {
          return `<li class="ml-4 list-disc">${line.slice(2)}</li>`
        }
        if (/^\d+\.\s/.test(line)) {
          return `<li class="ml-4 list-decimal">${line.replace(/^\d+\.\s/, '')}</li>`
        }
        return line ? `<p class="mb-2">${line}</p>` : ''
      })
      .join('')
  }

  const getSourceLabel = (type: string) => {
    return SOURCE_LABELS[type] || 'Source'
  }

  // Group sources by type for chips
  const groupSourcesByType = (sources: Source[]) => {
    const groups: Record<string, Source[]> = {}
    sources.forEach(s => {
      if (!groups[s.content_type]) {
        groups[s.content_type] = []
      }
      groups[s.content_type].push(s)
    })
    return groups
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-white/40 hover:text-white/70 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-al-orange overflow-hidden">
                <img src="/lenny.jpg" alt="Lenny" className="w-14 h-14 object-cover object-top scale-125" />
              </div>
              <div>
                <h1 className="text-white font-medium">Ask Lenny</h1>
                <p className="text-white/40 text-xs">AccuLynx Assistant</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-white/40 text-xs">Online</span>
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
                {/* Avatar for assistant */}
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-al-orange overflow-hidden">
                      <img src="/lenny.jpg" alt="Lenny" className="w-8 h-8 object-cover object-top scale-125" />
                    </div>
                    <span className="text-white/30 text-xs">Lenny</span>
                  </div>
                )}

                {/* Source Chips - shown above assistant messages */}
                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {Object.entries(groupSourcesByType(message.sources)).map(([type, sources]) => (
                      <button
                        key={type}
                        onClick={() => setExpandedSources(expandedSources === `${message.id}-${type}` ? null : `${message.id}-${type}`)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white/50 bg-white/5 hover:bg-white/10 hover:text-white/70 transition-colors"
                      >
                        <span>{sources.length} {getSourceLabel(type)}{sources.length > 1 ? 's' : ''}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Expanded Sources Panel */}
                {message.role === 'assistant' && expandedSources?.startsWith(message.id) && (
                  <div className="mb-3 bg-white/5 rounded-lg p-2.5 space-y-1.5">
                    {message.sources
                      ?.filter(s => expandedSources === `${message.id}-${s.content_type}`)
                      .map((source, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="text-white/70 truncate">{source.title}</p>
                            <p className="text-white/30 text-[10px] truncate">{source.url_or_path}</p>
                          </div>
                          <span className="text-white/25 text-[10px]">
                            {Math.round(source.similarity * 100)}%
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                
                {/* Message Bubble */}
                <div
                  className={`rounded-xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-al-orange text-white'
                      : 'bg-white/5 text-white/80'
                  }`}
                >
                  <div 
                    className="prose prose-sm prose-invert max-w-none [&>p:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                  />
                  {message.isStreaming && message.content === '' && (
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <p className={`text-white/20 text-[10px] mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 text-red-400/80 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="text-red-400/60 hover:text-red-400"
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
      <div className="border-t border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Lenny about AccuLynx..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-al-orange/50 resize-none text-sm"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-al-orange hover:bg-al-orange/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-white/20 text-xs mt-2 text-center">
            Responses may not always be accurate
          </p>
        </div>
      </div>
    </div>
  )
}
