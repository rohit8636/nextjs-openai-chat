'use client'

import { useState, useRef, useEffect } from 'react'

// Define the Message type directly in the file for a self-contained example
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const askTheAI = async () => {
    if (!input.trim() || loading) return

    const userInput = input.trim();
    setInput(''); // Clear input immediately for better UX

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userInput }])
    setLoading(true)

    try {
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userInput }),
      })

      if (!res.ok || !res.body) throw new Error('API request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      // Append initial empty assistant message to stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue

        // *** THE FIX IS HERE ***
        // This is an immutable state update. Instead of modifying the last
        // message object directly, we create a new array and a new object for
        // the last message. This prevents mutation and the double-append issue
        // caused by React's Strict Mode in development.
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];

          // Create a new message object with the updated content
          const updatedLastMessage = {
            ...lastMessage,
            content: lastMessage.content + chunk,
          };
          
          // Return a new array with the last message replaced
          return [...prev.slice(0, -1), updatedLastMessage];
        })
      }
    } catch (err) {
      console.error(err)
      // If an error occurs, find the last empty assistant message and replace it
      setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
              const updatedLastMessage = { ...lastMessage, content: 'Something went wrong.' };
              return [...prev.slice(0, -1), updatedLastMessage];
          }
          // Otherwise, just add a new error message
          return [...prev, { role: 'assistant', content: 'Something went wrong.' }];
      });
    } finally {
      setLoading(false)
    }
  }


  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg flex flex-col h-[90vh]">
        <h1 className="text-2xl font-bold p-4 border-b text-center text-gray-800">Streaming AI Chat</h1>
        
        {/* Chat container */}
        <div
          ref={chatContainerRef}
          className="flex-1 p-4 overflow-y-auto space-y-4"
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
           {loading && messages[messages.length -1]?.role === 'user' && (
             <div className="flex justify-start">
                <div className="max-w-lg p-3 rounded-xl bg-gray-200 text-gray-800">
                    <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex gap-2 items-center">
            <textarea
              className="flex-1 border rounded-lg p-2 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ask the AI something..."
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  askTheAI();
                }
              }}
              disabled={loading}
            />
            <button
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={askTheAI}
              disabled={loading}
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
