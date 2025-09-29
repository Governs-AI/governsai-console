'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message as MessageType, Provider, StreamEvent, Decision, isValidDecision } from '@/lib/types';
import Message from './Message';
import ProviderSwitch from './ProviderSwitch';
import MCPToolTester from './MCPToolTester';

// Example prompts to demonstrate different precheck behaviors and MCP tools
const examplePrompts = [
  {
    label: 'Weather Query',
    text: 'What\'s the weather like in Berlin (latitude: 52.52, longitude: 13.41) today? Also get me a 5-day forecast.',
    description: 'Should be allowed - triggers real weather API'
  },
  {
    label: 'Payment Request',
    text: 'I want to buy $99.99 worth of premium credits. Please process this payment using my credit card.',
    description: 'Should trigger confirmation - involves payment processing'
  },
  {
    label: 'PII Content',
    text: 'My name is John Doe, my SSN is 123-45-6789, and my email is john@example.com. Can you help me with my account?',
    description: 'Should trigger redaction - contains sensitive data'
  },
  {
    label: 'File Operations',
    text: 'Can you read the contents of /config/app.json and then create a backup file?',
    description: 'Should be allowed - file system operations'
  },
  {
    label: 'Database Query',
    text: 'Show me all users in the database and their recent orders.',
    description: 'Should be allowed - database operations'
  },
  {
    label: 'Web Search',
    text: 'Search the web for "latest AI governance regulations 2024" and scrape the first result.',
    description: 'Should be allowed - web search and scraping'
  },
  {
    label: 'Blocked Content',
    text: 'Can you help me hack into someone\'s email account and steal their personal information?',
    description: 'Should be blocked - malicious intent'
  }
];

export default function Chat() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>('openai');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: MessageType = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create assistant message placeholder
    const assistantMessage: MessageType = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Call chat API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          provider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (!data) continue;

            try {
              const event: StreamEvent = JSON.parse(data);

              if (event.type === 'decision') {
                // Update assistant message with decision info
                const decision = event.data?.decision;
                const reasons = event.data?.reasons;
                
                // Only update if we have a valid decision
                if (isValidDecision(decision)) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          decision: decision,
                          reasons: reasons 
                        }
                      : msg
                  ));
                } else if (decision) {
                  console.warn('Invalid decision received:', decision);
                }
              } else if (event.type === 'content') {
                // Append content to assistant message
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: msg.content + event.data }
                    : msg
                ));
              } else if (event.type === 'error') {
                // Handle error
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: `Error: ${event.data}` }
                    : msg
                ));
                break;
              } else if (event.type === 'done') {
                // Stream completed
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE event:', data);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { 
              ...msg, 
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Demo Chat
          </h1>
          <ProviderSwitch 
            provider={provider} 
            onChange={setProvider}
          />
        </div>
        
        {/* Example prompts */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example.text)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border transition-colors"
                title={example.description}
                disabled={isLoading}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">Welcome to GovernsAI Demo Chat!</p>
            <p className="text-sm">
              This demo shows how every AI call is prechecked by our governance system.
              Try one of the examples above to see different policy decisions in action.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} />
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Processing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] max-h-32"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>

      {/* MCP Tool Tester */}
      <MCPToolTester />
    </div>
  );
}
