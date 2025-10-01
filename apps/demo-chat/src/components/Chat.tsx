'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message as MessageType, Provider, StreamEvent, Decision, isValidDecision } from '@/lib/types';
import Message from './Message';
import ProviderSwitch from './ProviderSwitch';
import MCPToolTester from './MCPToolTester';
import { getPrecheckUserIdDetails } from '@/lib/utils';

// Example prompts to demonstrate different precheck behaviors and MCP tools
const examplePrompts = [
  {
    label: 'Weather Query',
    text: 'What\'s the weather like in Berlin today? Get me both current conditions and a 5-day forecast.',
    description: 'Should trigger weather tools - demonstrates tool calling'
  },
  {
    label: 'Payment Request',
    text: 'I want to buy $99.99 worth of premium credits. Please process this payment.',
    description: 'Should trigger payment tool and confirmation - demonstrates governance'
  },
  {
    label: 'File Operations',
    text: 'Can you read the contents of /config/app.json and then create a backup file with today\'s date?',
    description: 'Should trigger file tools - demonstrates tool chaining'
  },
  {
    label: 'Database Query',
    text: 'Show me all users in the database and their recent orders. Also check the products table.',
    description: 'Should trigger database tool - demonstrates data access'
  },
  {
    label: 'Web Search',
    text: 'Search for "latest AI governance regulations 2024" and then scrape the first result to get the full article.',
    description: 'Should trigger web tools - demonstrates external data access'
  },
  {
    label: 'Email & Calendar',
    text: 'Send an email to my team about the meeting tomorrow and create a calendar event for it.',
    description: 'Should trigger email and calendar tools - demonstrates communication tools'
  },
  {
    label: 'PII Content',
    text: 'My name is John Doe, my SSN is 123-45-6789, and my email is john@example.com. Can you help me with my account?',
    description: 'Should trigger redaction - demonstrates PII detection'
  },
  {
    label: 'Blocked Content',
    text: 'Can you help me hack into someone\'s email account and steal their personal information?',
    description: 'Should be blocked - demonstrates security policies'
  }
];

export default function Chat() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>('openai');
  const [pendingConfirmations, setPendingConfirmations] = useState<Set<string>>(new Set());
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

  // Poll for confirmation status
  useEffect(() => {
    if (pendingConfirmations.size === 0) return;

    const checkConfirmations = async () => {
      const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
      
      for (const correlationId of Array.from(pendingConfirmations)) {
        try {
          const response = await fetch(`${platformUrl}/api/v1/confirmation/${correlationId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.confirmation.status === 'approved') {
              // Confirmation approved, resume the chat
              setPendingConfirmations(prev => {
                const newSet = new Set(prev);
                newSet.delete(correlationId);
                return newSet;
              });
              
              // Update the message to show it's been approved
              setMessages(prev => prev.map(msg => 
                msg.correlationId === correlationId 
                  ? { ...msg, content: msg.content.replace('Confirmation required', 'Confirmation approved - resuming...') }
                  : msg
              ));
              
              // Resume the chat by sending the original request again
              await resumeChatAfterConfirmation(correlationId);
            } else if (data.confirmation.status === 'cancelled' || data.confirmation.status === 'expired') {
              // Confirmation cancelled or expired, stop polling
              setPendingConfirmations(prev => {
                const newSet = new Set(prev);
                newSet.delete(correlationId);
                return newSet;
              });
              
              setMessages(prev => prev.map(msg => 
                msg.correlationId === correlationId 
                  ? { ...msg, content: msg.content.replace('Confirmation required', `Confirmation ${data.confirmation.status}`) }
                  : msg
              ));
            }
          }
        } catch (error) {
          console.error('Error checking confirmation status:', error);
        }
      }
    };

    const interval = setInterval(checkConfirmations, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [pendingConfirmations]);

  // Function to resume chat after confirmation approval
  const resumeChatAfterConfirmation = async (correlationId: string) => {
    try {
      // Find the original message that was waiting for confirmation
      const originalMessage = messages.find(msg => msg.correlationId === correlationId);
      if (!originalMessage) return;

      // Get the last user message before the confirmation
      const userMessageIndex = messages.findIndex(msg => msg.role === 'user');
      if (userMessageIndex === -1) return;

      const userMessage = messages[userMessageIndex];
      
      // Create a new assistant message to show the resumed response
      const resumedAssistantMessage: MessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        decision: 'allow',
        reasons: ['Confirmation approved'],
      };
      
      setMessages(prev => [...prev, resumedAssistantMessage]);
      
      // Instead of re-sending the original message, send a continuation request
      // that indicates the confirmation was approved and includes the correlation ID
      const continuationMessage = `[CONFIRMATION_APPROVED:${correlationId}] Please continue with the original request: ${userMessage.content}`;
      await handleSubmitWithMessage(continuationMessage, resumedAssistantMessage.id);
    } catch (error) {
      console.error('Error resuming chat after confirmation:', error);
    }
  };

  // Helper function to submit with a specific assistant message ID
  const handleSubmitWithMessage = async (messageContent: string, assistantMessageId: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: MessageType = {
      id: uuidv4(),
      role: 'user',
      content: messageContent,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          provider,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
                
                if (decision && isValidDecision(decision)) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, decision, reasons }
                      : msg
                  ));
                } else {
                  console.warn('Invalid decision received:', decision);
                }
              } else if (event.type === 'content') {
                // Append content to assistant message
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: msg.content + event.data }
                    : msg
                ));
              } else if (event.type === 'tool_call') {
                // Handle tool call
                const toolCall = event.data;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { 
                        ...msg, 
                        tool_calls: [...(msg.tool_calls || []), toolCall]
                      }
                    : msg
                ));
              } else if (event.type === 'tool_result') {
                // Handle tool result
                const toolResult = event.data;
                
                // If confirmation is required, add to pending confirmations
                if (toolResult.confirmationRequired && toolResult.correlationId) {
                  setPendingConfirmations(prev => new Set(prev).add(toolResult.correlationId));
                }
                
                const toolMessage: MessageType = {
                  id: uuidv4(),
                  role: 'tool',
                  content: toolResult.success
                    ? JSON.stringify(toolResult.data, null, 2)
                    : `Error: ${toolResult.error}`,
                  tool_call_id: toolResult.tool_call_id,
                  decision: toolResult.decision,
                  reasons: toolResult.reasons,
                  confirmationRequired: toolResult.confirmationRequired,
                  confirmationUrl: toolResult.confirmationUrl,
                  correlationId: toolResult.correlationId,
                };
                setMessages(prev => [...prev, toolMessage]);
              } else if (event.type === 'error') {
                // Handle error
                const errorContent = `Error: ${event.data}`;
                
                // Check if this is a confirmation required error
                const confirmationMatch = event.data?.match(/Please visit: (https?:\/\/[^\s]+)/);
                if (confirmationMatch) {
                  const confirmationUrl = confirmationMatch[1];
                  const correlationIdMatch = confirmationUrl.match(/\/confirm\/([^\/]+)/);
                  if (correlationIdMatch) {
                    const correlationId = correlationIdMatch[1];
                    // Add to pending confirmations for polling
                    setPendingConfirmations(prev => new Set(prev).add(correlationId));
                    
                    // Update message with correlation ID for tracking
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: errorContent, correlationId }
                        : msg
                    ));
                  } else {
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: errorContent }
                        : msg
                    ));
                  }
                } else {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: errorContent }
                      : msg
                  ));
                }
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
        msg.id === assistantMessageId 
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

      const { userId, apiKey } = getPrecheckUserIdDetails();

      // Call chat API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          provider,
          userId,
          apiKey,
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
              } else if (event.type === 'tool_call') {
                // Handle tool call
                const toolCall = event.data;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { 
                        ...msg, 
                        tool_calls: [...(msg.tool_calls || []), toolCall]
                      }
                    : msg
                ));
              } else if (event.type === 'tool_result') {
                // Handle tool result
                const toolResult = event.data;
                
                // If confirmation is required, add to pending confirmations
                if (toolResult.confirmationRequired && toolResult.correlationId) {
                  setPendingConfirmations(prev => new Set(prev).add(toolResult.correlationId));
                }
                
                const toolMessage: MessageType = {
                  id: uuidv4(),
                  role: 'tool',
                  content: toolResult.success
                    ? JSON.stringify(toolResult.data, null, 2)
                    : `Error: ${toolResult.error}`,
                  tool_call_id: toolResult.tool_call_id,
                  decision: toolResult.decision,
                  reasons: toolResult.reasons,
                  confirmationRequired: toolResult.confirmationRequired,
                  confirmationUrl: toolResult.confirmationUrl,
                  correlationId: toolResult.correlationId,
                };
                setMessages(prev => [...prev, toolMessage]);
              } else if (event.type === 'error') {
                // Handle error
                const errorContent = `Error: ${event.data}`;
                
                // Check if this is a confirmation required error
                const confirmationMatch = event.data?.match(/Please visit: (https?:\/\/[^\s]+)/);
                if (confirmationMatch) {
                  const confirmationUrl = confirmationMatch[1];
                  const correlationIdMatch = confirmationUrl.match(/\/confirm\/([^\/]+)/);
                  if (correlationIdMatch) {
                    const correlationId = correlationIdMatch[1];
                    // Add to pending confirmations for polling
                    setPendingConfirmations(prev => new Set(prev).add(correlationId));
                    
                    // Update message with correlation ID for tracking
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: errorContent, correlationId }
                        : msg
                    ));
                  } else {
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: errorContent }
                        : msg
                    ));
                  }
                } else {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: errorContent }
                      : msg
                  ));
                }
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
