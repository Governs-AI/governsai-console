'use client';

import { Message as MessageType } from '@/lib/types';
import DecisionBadge from './DecisionBadge';

interface MessageProps {
  message: MessageType;
  className?: string;
}

export default function Message({ message, className = '' }: MessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        
        {/* Show decision badge for assistant messages */}
        {!isUser && message.decision && (
          <div className="mt-2 flex justify-start">
            <DecisionBadge 
              decision={message.decision} 
              reasons={message.reasons}
            />
          </div>
        )}
        
        {/* Role label for accessibility */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? 'You' : 'Assistant'}
        </div>
      </div>
    </div>
  );
}
