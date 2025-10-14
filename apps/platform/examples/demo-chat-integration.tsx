/**
 * Demo Chat App Integration Example
 * 
 * This example shows how to integrate the unified context memory system
 * into a chat application.
 */

import React, { useState, useEffect } from 'react';
import { createDemoChatClient, ContextMemoryClient } from '@governs-ai/context-client';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  contextId?: string;
}

interface ChatProps {
  userId: string;
  orgId: string;
  baseUrl: string;
}

export function DemoChatWithContext({ userId, orgId, baseUrl }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [contextClient] = useState(() => 
    createDemoChatClient(baseUrl, userId, orgId)
  );

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        const conversation = await contextClient.getOrCreateConversation('Demo Chat Session');
        setConversationId(conversation.id);
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };

    initConversation();
  }, [contextClient]);

  // Find relevant context for user input
  const findRelevantContext = async (query: string): Promise<string[]> => {
    try {
      const results = await contextClient.findRelevantContext(query, {
        limit: 3,
        threshold: 0.7,
      });

      return results.map(result => result.content);
    } catch (error) {
      console.error('Failed to find relevant context:', error);
      return [];
    }
  };

  // Store user message and get AI response
  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Store user message in context
      const { contextId } = await contextClient.storeUserMessage(input, {
        conversationId,
        metadata: {
          sessionId: 'demo-session',
          timestamp: new Date().toISOString(),
        },
      });

      userMessage.contextId = contextId;

      // Find relevant context
      const relevantContext = await findRelevantContext(input);

      // Generate AI response (this would integrate with your AI service)
      const aiResponse = await generateAIResponse(input, relevantContext);

      // Store AI response in context
      const { contextId: responseContextId } = await contextClient.storeAgentResponse(aiResponse, {
        conversationId,
        metadata: {
          relevantContext: relevantContext,
          model: 'gpt-4',
          timestamp: new Date().toISOString(),
        },
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date(),
        contextId: responseContextId,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to process message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock AI response generation (replace with actual AI service)
  const generateAIResponse = async (userInput: string, context: string[]): Promise<string> => {
    // This would integrate with your AI service (OpenAI, Anthropic, etc.)
    // For demo purposes, return a simple response
    return `I understand you're asking about "${userInput}". Based on our previous conversations, I can help you with that. ${context.length > 0 ? 'I found some relevant context that might help.' : ''}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold">Demo Chat with Context Memory</h1>
        <p className="text-sm text-gray-600">
          This chat remembers our conversation across sessions
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for using context memory in React components
 */
export function useContextMemory(userId: string, orgId: string, baseUrl: string) {
  const [contextClient] = useState(() => 
    createDemoChatClient(baseUrl, userId, orgId)
  );

  const storeMessage = async (content: string, role: 'user' | 'assistant', conversationId?: string) => {
    if (role === 'user') {
      return contextClient.storeUserMessage(content, { conversationId });
    } else {
      return contextClient.storeAgentResponse(content, { conversationId });
    }
  };

  const searchContext = async (query: string, options?: { limit?: number; threshold?: number }) => {
    return contextClient.findRelevantContext(query, options);
  };

  const getConversation = async (title?: string) => {
    return contextClient.getOrCreateConversation(title);
  };

  return {
    storeMessage,
    searchContext,
    getConversation,
    contextClient,
  };
}
